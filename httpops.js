// GoalKeeper app for slack... HTTP operations

// 2018-03-12 - Shaun L. Cloherty <s.cloherty@ieee.org>

function postToUrl(url,payload) {
  // POST payload (after json encoding) to url, e.g., a webhook or
  // response_url for sending delayed responses

//  var payload = {
//    response_type: "ephemeral",
//    text: "Ok, got it!"
//  };

  var options = {
    method: "post",
    contentType : "application/json",
    payload: JSON.stringify(payload)
  };

  return UrlFetchApp.fetch(url,options);
}

function testPostToUrl() {
  // test postToUrl()
  var url = ""; // https://requestb.in/[blah blah blah] or similar

  msg = {
    field1: "value1",
    field2: "value2"
  };

  Logger.log("Testing postToUrl(%s,%s)",url,msg);

  var response = postToUrl(url,msg);

  Logger.log("- %s",response);
}
