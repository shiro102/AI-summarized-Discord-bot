export const redditUrl = 'https://www.reddit.com/r/aww/hot.json';

/**
 * Reach out to the reddit API, and get the first page of results from
 * r/aww. Filter out posts without readily available images or videos,
 * and return a random result.
 * @returns The url of an image or video which is cute.
 */
export async function getCuteUrl() {
  try {
    const response = await fetch(redditUrl, {
      headers: {
        'User-Agent': 'DiscordBot:AI-summarized-Discord-bot:v1.0.0 (contact: admin)',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
    if (!response.ok) {
      console.error(`Reddit API returned ${response.status}: ${response.statusText}`);
      if (response.status === 403) {
        throw new Error('Reddit API access forbidden. This might be due to rate limiting or API restrictions.');
      }
      throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    // Check if we have valid data structure
    if (!data?.data?.children || !Array.isArray(data.data.children)) {
      throw new Error('Invalid response structure from Reddit API');
    }

    const posts = data.data.children
      .map((post) => {
        if (post.is_gallery) {
          return '';
        }
        return (
          post.data?.media?.reddit_video?.fallback_url ||
          post.data?.secure_media?.reddit_video?.fallback_url ||
          post.data?.url
        );
      })
      .filter((post) => !!post && typeof post === 'string' && post.startsWith('http'));
    
    if (posts.length === 0) {
      throw new Error('No valid posts found in Reddit response');
    }
    
    const randomIndex = Math.floor(Math.random() * posts.length);
    const randomPost = posts[randomIndex];
    return randomPost;
  } catch (error) {
    console.error('Error fetching cute content from Reddit:', error);
    return 'Sorry, I couldn\'t fetch any cute content right now! 🐱 Please try again later.';
  }
}
