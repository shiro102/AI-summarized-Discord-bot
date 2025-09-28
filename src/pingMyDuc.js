// Login to MyDuc API and get authentication cookie
async function loginToMyDuc(env) {
  if (!env.MYDUC_EMAIL || !env.MYDUC_PASSWORD) {
    console.warn('MYDUC_EMAIL or MYDUC_PASSWORD not configured, skipping MyDuc API login');
    return null;
  }

  const loginUrl = 'https://nhakhoamyduc-api.onrender.com/api/login';
  
  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
      },
      body: JSON.stringify({
        email: env.MYDUC_EMAIL,
        password: env.MYDUC_PASSWORD
      })
    });

    if (!response.ok) {
      console.error(`Login to MyDuc API failed: ${response.status} ${response.statusText}`);
      return null;
    }

    // Extract cookies from response headers
    const setCookieHeader = response.headers.get('set-cookie');
    console.log('Set-Cookie header:', setCookieHeader);
    
    if (setCookieHeader) {
      // Extract the userId cookie value
      const userIdMatch = setCookieHeader.match(/userId=([^;]+)/);
      if (userIdMatch) {
        const userId = userIdMatch[1];
        console.log('Successfully logged in to MyDuc API, userId:', userId);
        return `userId=${userId}`;
      }
    }

    console.error('Login successful but no userId cookie found');
    return null;
  } catch (error) {
    console.error('Error logging in to MyDuc API:', error);
    return null;
  }
}

// ping the MyDuc API
export async function pingMyDuc(env) {
  console.log('pinging MyDuc API');
  
  // First, login to get authentication cookie
  const authCookie = await loginToMyDuc(env);
  if (!authCookie) {
    console.log('No cookies found because login failed');
  }

  const url = `https://nhakhoamyduc-api.onrender.com/api/clients?search=pingFromAwwBot`;
  
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site'
    };
    
    // Only add Cookie header if we have authCookie
    if (authCookie) {
      headers['Cookie'] = authCookie;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      let errorDetails = `${response.status} ${response.statusText}`;
      
      // Try to get response body for more details
      try {
        const errorText = await response.text();
        if (errorText) {
          errorDetails += `. Response body: ${errorText}`;
        } else {
          errorDetails += `. Response body is empty.`;
        }
      } catch (e) {
        errorDetails += `. Could not read response body.`;
      }
      
      console.log(`Pinged MyDuc API: ${errorDetails}`);
      return;
    }
    
    const data = await response.json();
    if (Array.isArray(data) && data.length === 0) {
      console.log('Successfully pinged MyDuc API: No results found (empty array)');
    } else if (data) {
      console.log('Successfully got data from MyDuc API:', JSON.stringify(data, null, 2));
    } else {
      console.log('Successfully pinged MyDuc API: No data returned');
    }
  } catch (error) {
    console.error('Error pinging MyDuc API:', error);
  }
}
