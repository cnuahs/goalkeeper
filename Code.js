// bare bones slash command handler for slack...

// 2018-03-02 - Shaun L. Cloherty <s.cloherty@ieee.org>

function doPost(payload) {
  return ContentService.createTextOutput('Got POST at '+ new Date());
}
