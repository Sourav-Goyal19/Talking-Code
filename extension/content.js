chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_REPO_DATA") {
    const repoData = extractRepoData();
    sendResponse({ type: "REPO_DATA", data: repoData });
  }
});

function extractRepoData() {
  const url = window.location.href;
  const repoName = url.match(/https:\/\/github\.com\/([^/]+\/[^/]+)/)[1];
  return fetch(`https://api.github.com/repos/${repoName}`)
    .then((response) => response.json())
    .catch((error) => console.error("Error fetching repo data:", error));
}
