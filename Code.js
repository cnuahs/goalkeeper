// bare bones slash command handler for slack...

// POST payloads from slack slash commands contain the following fields:
//
//   user_name: shaunc
//   trigger_id: 323566020866.140237611429.d0b91a86770f6d14f4f35304f6be858c
//   user_id: U444CRH8S
//   team_id: T446ZHZCM
//   response_url: https://hooks.slack.com/commands/T446ZHZCM/324617447287/H6jQI1o93lOIrQBBnvVdvAj5
//   channel_name: zapier
//   token: SLACK VERIFICATION TOKEN
//   team_domain: marmolab
//   command: /goal
//   channel_id: C9H2SGDAB
//   text: my new goal

// 2018-03-02 - Shaun L. Cloherty <s.cloherty@ieee.org>

function doPost(payload) {

  if (payload.parameter.token != slackToken()) {
    var err = { text: '',
                attachments: [ mkErrorAttachment('Verification failed.') ] };

    return ContentService.createTextOutput(JSON.stringify(err)).setMimeType(ContentService.MimeType.JSON);
  }

  var user = payload.parameters.user_name;
  var args = payload.parameters.text;

  switch (payload.command) {
    case '/goal':
      return goalHandler(user,args);
      break;
    case '/score':
      return scoreHandler(user,args);
      break;
  }

  // shouldn't be possible to end up here...
  return ContentService.createTextOutput('Got POST on '+ new Date());
}

function goalHandler(user,args) {
  // handler for /goal commands

  // possible variants:
  //
  //   /goal <-- return current goal (user only, not displayed in channel)
  //   /goal @user <-- return current goal for @user (user only, not in channel)
  //   /goal new goal <-- set current goal to 'new goal' (shows in channel)
  //   /goal @user new goal <-- set current goal for @user (shows in channel)?
  //
  // so, args should be a string like: "<@U444CRH8S|shaunc> shaun's new goal"

  return ContentService.createTextOutput('user: ' + user + ', args: ' + args + '.');
}

function scoreHandler(user,args) {
  // handler for /score commands

  // possible variants:
  //
  //   /score <-- return current users score (user only, not in channel)
  //   /score @user <-- return the score for @user (user only, not in nchannel)
  //   /score @user score <-- set the score for @user (note: cannot set your own score) (shows in channel)
}

function mkErrorAttachment(msg) {
  return ({
    color: 'danger',
    text: '*Error*:\n' + msg,
    mrkdwn_in: ['text']
  })
}
