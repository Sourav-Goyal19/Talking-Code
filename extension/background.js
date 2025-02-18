chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed!");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_REPO_DATA") {
    chrome.scripting.executeScript(
      {
        target: { tabId: sender.tab.id },
        func: extractRepoData,
      },
      (result) => {
        const repoData = result[0].result;
        // Send repoData to your custom API
        fetch("https://your-custom-api.com/repo-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(repoData),
        })
          .then((response) => response.json())
          .then((data) => {
            // Handle the response from your API
            sendResponse({ type: "API_RESPONSE", data: data });
          })
          .catch((error) => {
            console.error("Error sending data to API:", error);
            sendResponse({ type: "API_ERROR", error: error.message });
          });
      }
    );
    return true; // Keep the message channel open
  }
});

function extractRepoData() {
  const url = window.location.href;
  const repoName = url.match(/https:\/\/github\.com\/([^/]+\/[^/]+)/)[1];
  return fetch(`https://api.github.com/repos/${repoName}`)
    .then((response) => response.json())
    .catch((error) => console.error("Error fetching repo data:", error));
}
