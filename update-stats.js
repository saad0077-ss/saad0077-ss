const fs = require('fs');
const https = require('https');

// LeetCode GraphQL API endpoint
const LEETCODE_API = 'https://leetcode.com/graphql';

// Your LeetCode username
const USERNAME = '_sa____ad_';

const query = `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      profile {
        realName
        userAvatar
      }
      submitStats {
        acSubmissionNum {
          difficulty
          count
          submissions
        }
        totalSubmissionNum {
          difficulty
          count
          submissions
        }
      }
    }
  }
`;

function fetchLeetCodeStats() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      query,
      variables: { username: USERNAME }
    });

    const options = {
      hostname: 'leetcode.com',
      path: '/graphql',
      method: 'POST',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://leetcode.com/',
        'Accept': 'application/json'
      }
    };

    console.log('📡 Sending request to LeetCode GraphQL API...');
    
    const req = https.request(options, (res) => {
      let data = '';

      console.log(`📊 Response status: ${res.statusCode}`);

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.errors) {
            reject(new Error(`GraphQL Error: ${JSON.stringify(response.errors)}`));
          } else if (!response.data || !response.data.matchedUser) {
            reject(new Error('User not found or no data returned'));
          } else {
            console.log('✅ Successfully fetched LeetCode data');
            resolve(response.data.matchedUser);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Request failed: ${e.message}`));
    });

    req.on('timeout', () => {
      req.abort();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

async function updateReadme() {
  try {
    console.log('🔄 Fetching LeetCode stats...');
    const stats = await fetchLeetCodeStats();

    if (!stats || !stats.submitStats) {
      throw new Error('Could not fetch LeetCode stats');
    }

    const acStats = stats.submitStats.acSubmissionNum;
    const easyCount = acStats.find(s => s.difficulty === 'Easy')?.count || 0;
    const mediumCount = acStats.find(s => s.difficulty === 'Medium')?.count || 0;
    const hardCount = acStats.find(s => s.difficulty === 'Hard')?.count || 0;
    const totalSolved = easyCount + mediumCount + hardCount;

    console.log(`✅ LeetCode Stats Found:`);
    console.log(`   Total: ${totalSolved} | Easy: ${easyCount} | Medium: ${mediumCount} | Hard: ${hardCount}`);

    // Read README
    const readmePath = './README.md';
    let readmeContent = fs.readFileSync(readmePath, 'utf8');
    let updated = false;

    // Update the LeetCode stats section with more flexible patterns
    const badges = [
      { pattern: /Total_Solved-\d+(?=-|$)/g, replacement: `Total_Solved-${totalSolved}` },
      { pattern: /Easy-\d+(?=-|$)/g, replacement: `Easy-${easyCount}` },
      { pattern: /Medium-\d+(?=-|$)/g, replacement: `Medium-${mediumCount}` },
      { pattern: /Hard-\d+(?=-|$)/g, replacement: `Hard-${hardCount}` }
    ];

    badges.forEach(({ pattern, replacement }) => {
      if (pattern.test(readmeContent)) {
        readmeContent = readmeContent.replace(pattern, replacement);
        updated = true;
      }
    });

    console.log(`📝 Stats updated in README: ${updated}`);

    // Write back to README
    fs.writeFileSync(readmePath, readmeContent);
    console.log('✨ README.md updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating stats:', error.message);
    console.error('📋 Full error details:', error);
    // Don't exit with error code - allows workflow to complete
    process.exit(0);
  }
}

// Run the update
updateReadme();
