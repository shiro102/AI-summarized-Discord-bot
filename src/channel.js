// initialize the constant variables
const BASE_URL = 'https://discord.com/api/v10';

// check for new channels, if yes append the channels' info to the channelList
export async function checkChannelStatus(env, channelList) {
  const url = `${BASE_URL}/guilds/${env.DISCORD_SERVER_ID}/channels`;

  try {
    const r = await fetch(url, {
      headers: {
        Authorization: `Bot ${env.DISCORD_TOKEN}`,
      },
    });

    if (!r.ok) {
      console.error('Failed to fetch channels information:', r.statusText);
      return;
    }

    const data = await r.json();
    for (const item of data) {
      // Filter channel with type = 0 (text channel) and append to channelList if not already present
      if (
        item.type === 0 &&
        !channelList.some((channel) => channel.id === item.id)
      ) {
        console.log(`New channel detected: ${item.name}`);
        channelList.push(item);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

// summarize the chat using OpenAI
export async function summarizeChat(env, channelList) {
  try {
    for (const channel of channelList) {
      const url = `${BASE_URL}/channels/${channel.id}/messages?after=${channel.last_message_id}`;

      const r = await fetch(url, {
        headers: {
          Authorization: `Bot ${env.DISCORD_TOKEN}`,
        },
      });

      if (!r.ok) {
        console.error(`Failed to fetch channel messages for channel: ${channel.name}, error: `, r.statusText);
        return;
      }

      const messages = await r.json();

      if (messages.length >= 4) {
        console.log(
          `Channel ${channel.name} has reached 4 or more new messages in 1 hour. Started summarizing.`,
        );

        // make a string in this format: "username": "message" to feed to OpenAI
        const chatText = messages
          .filter((msg) => !msg.author.bot)
          .map(
            (msg) =>
              (msg.author.global_name || msg.author.username) +
              ': ' +
              msg.content,
          )
          .join('\n');

        console.log(`Channel ${channel.name} chat text: ${chatText}`);

        const rSummary = await sendTextToOpenAI(env, chatText);

        if (rSummary.choices) {
          console.log(
            `Channel ${channel.name} OpenAI's response: ${JSON.stringify(rSummary)}`,
          );

          // Step 1. Send a placeholder message to serve as the parent for the thread.
          const now = new Date();
          const formattedTimestamp = now.toLocaleString('en-US', {
            timeZone: 'America/Los_Angeles', // PST/PDT time zone
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          }); // Adjust locale and options as needed
          const parentMessageUrl = `${BASE_URL}/channels/${channel.id}/messages`;
          const placeholderBody = {
            content: `📌 ***New Chat Summary***, channel **${channel.name}**, ${formattedTimestamp}`, // This text will be shown in the channel.
            // Remove flags so the message isn’t ephemeral.
          };

          const parentResponse = await fetch(parentMessageUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bot ${env.DISCORD_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(placeholderBody),
          });

          if (!parentResponse.ok) {
            console.error(
              `Failed to send parent message to create thread for channel: ${channel.name}, error: `,
              parentResponse.statusText,
            );
            return;
          }

          const parentMessage = await parentResponse.json();

          // Step 2. Create a thread from the parent message.
          const createThreadUrl = `${BASE_URL}/channels/${channel.id}/messages/${parentMessage.id}/threads`;
          const threadBody = {
            name: 'Chat Summary', // Name of the thread.
            auto_archive_duration: 60, // Auto-archive in 60 minutes (adjust as needed).
          };

          const threadResponse = await fetch(createThreadUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bot ${env.DISCORD_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(threadBody),
          });

          if (!threadResponse.ok) {
            console.error(
              `Failed to create thread from parent message for channel: ${channel.name}, error: `,
              threadResponse.statusText,
            );
            return;
          }

          const thread = await threadResponse.json();

          // Step 3. Post the summary message inside the newly created thread.
          const threadMessageUrl = `${BASE_URL}/channels/${thread.id}/messages`;
          const summaryMessageBody = {
            content:
              rSummary.choices[0].message.content +
              '\n\n (*An automated summary for conversation with more than 4 message within the last 1 hour using OpenAI. For longer conversations, please use Catch Me Up bot: https://discord.com/channels/1308157457822126141/1308157457822126143/1339446628725162054.*)',
          };

          const threadMessageResponse = await fetch(threadMessageUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bot ${env.DISCORD_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(summaryMessageBody),
          });

          if (!threadMessageResponse.ok) {
            console.error(
              `Failed to send summary message inside thread for channel: ${channel.name}, error: `,
              threadMessageResponse.statusText,
            );
            return;
          }
        }
      }

      // update the last_message_id when the summary is sent to Discord or if the conversation is too short (in every hour as set in the CF worker schedule)
      if (messages.length > 0) {
        channel.last_message_id = messages[0].id;
      }
    }
  } catch (err) {
    console.error(err);
  }
}

// send the chat text to OpenAI and return the summary
export async function sendTextToOpenAI(env, chatText) {
  const url = `https://api.openai.com/v1/chat/completions`;

  const body = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'developer',
        content:
          'Give a short summary of the following conversation. Then give bullet points items to summarize each separate items with details.',
      },
      { role: 'user', content: chatText },
    ],
  };

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      console.error(`Failed to summarize chat using OpenAI: ${JSON.stringify(r)}`);
      return;
    } else {
      return r.json();
    }
  } catch (err) {
    console.error(err);
    return;
  }
}
