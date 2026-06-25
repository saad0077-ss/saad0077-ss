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
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.errors) {
            reject(new Error(`GraphQL Error: ${response.errors[0].message}`));
          } else {
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

    console.log(`✅ LeetCode Stats: ${totalSolved} problems solved`);
    console.log(`   Easy: ${easyCount} | Medium: ${mediumCount} | Hard: ${hardCount}`);

    // Read README
    const readmePath = './README.md';
    let readmeContent = fs.readFileSync(readmePath, 'utf8');

    // Update the LeetCode stats section
    // You can customize the regex pattern based on your README structure
    const statsPattern = /Total_Solved-\d+-/g;
    const easyPattern = /Easy-\d+-/g;
    const mediumPattern = /Medium-\d+-/g;
    const hardPattern = /Hard-\d+-/g;

    readmeContent = readmeContent.replace(statsPattern, `Total_Solved-${totalSolved}-`);
    readmeContent = readmeContent.replace(easyPattern, `Easy-${easyCount}-`);
    readmeContent = readmeContent.replace(mediumPattern, `Medium-${mediumCount}-`);
    readmeContent = readmeContent.replace(hardPattern, `Hard-${hardCount}-`);

    // Update timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 16) + ' UTC';
    const timestampPattern = /<!-- last-updated: .* -->/;
    readmeContent = readmeContent.replace(timestampPattern, `<!-- last-updated: ${timestamp} -->`);

    // Write back to README
    fs.writeFileSync(readmePath, readmeContent);
    console.log('✨ README.md updated successfully');
  } catch (error) {
    console.error('❌ Error updating stats:', error.message);
    process.exit(1);
  }
}

// Run the update
updateReadme();
