/**
 * semp-client
 * @author Andrew Roberts
 */

import { clientConfig } from "./clients.config";
import { makeRequest } from "./http-client";

export async function fetchConnectedClients({ brokerIp, port, messageVpn }) {
  let baseUrl = `http://${brokerIp}:${port}/SEMP/v2/monitor/msgVpns/${messageVpn}`;

  const getRequestParams = {
    baseUrl: baseUrl,
    basicAuthUsername: clientConfig.SEMP_USERNAME,
    basicAuthPassword: clientConfig.SEMP_PASSWORD,
    endpoint: `/clients`,
    method: "GET"
  };
  try {
    console.log(`Fetching client connections in Msg VPN "${messageVpn}"...`);
    let res = await makeRequest(getRequestParams);
    console.dir(res["data"]);
    return res["data"];
  } catch (err) {
    console.error(err);
    return false;
  }
}

export async function provisionQueue({
  brokerIp,
  port,
  messageVpn,
  queueName,
  sempUsername,
  sempPassword
}) {
  let baseUrl = `http://${brokerIp}:${port}/SEMP/v2/config/msgVpns/${messageVpn}`;

  const msgVpnQueueConfig = {
    egressEnabled: true,
    ingressEnabled: true,
    permission: "consume",
    queueName: queueName
  };

  const putRequestParams = {
    baseUrl: baseUrl,
    basicAuthUsername: sempUsername,
    basicAuthPassword: sempPassword,
    body: {
      ...msgVpnQueueConfig
    },
    endpoint: `/queues/${encodeURIComponent(queueName)}`,
    method: "PUT"
  };
  try {
    console.log(`Provisioning queue "${queueName}"...`);
    let res = await makeRequest(putRequestParams);
    console.log(`Successfully provisioned queue "${queueName}".`);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

export async function addTopicSubscriptionToQueue({
  queueName,
  subscriptionTopic,
  sempUsername,
  sempPassword
}) {
  let baseUrl = `http://${brokerIp}:${port}/SEMP/v2/config/msgVpns/${messageVpn}`;

  // first, make a GET request to see if the subscription already exists
  const getRequestParams = {
    baseUrl: baseUrl,
    basicAuthUsername: sempUsername,
    basicAuthPassword: sempPassword,
    endpoint: `/queues/${encodeURIComponent(
      queueName
    )}/subscriptions/${encodeURIComponent(subscriptionTopic)}`,
    method: "GET"
  };
  try {
    console.log(
      `Adding queue subscription "${subscriptionTopic}" to queue "${queueName}"...`
    );
    let res = await makeRequest(getRequestParams);
    console.log(
      `Queue subscription "${subscriptionTopic}" already exists on queue "${queueName}".`
    );
    return true;
  } catch {
    // if the queue subscription does not exist, provision it
    const msgVpnQueueSubscriptionConfig = {
      subscriptionTopic: subscriptionTopic
    };
    const postRequestParams = {
      baseUrl: baseUrl,
      basicAuthUsername: sempUsername,
      basicAuthPassword: sempPassword,
      body: { ...msgVpnQueueSubscriptionConfig },
      endpoint: `/queues/${encodeURIComponent(queueName)}/subscriptions`,
      method: "POST"
    };
    try {
      let res = await makeRequest(postRequestParams);
      console.log(
        `Successfully added queue subscription "${subscriptionTopic}" to queue "${queueName}".`
      );
      return true;
    } catch (err) {
      throw new Error(err);
    }
  }
}

export async function startReplay({
  brokerIp,
  fromTime,
  port,
  messageVpn,
  sempUsername,
  sempPassword,
  replayQueue
}) {
  let baseUrl = `http://${brokerIp}:${port}/SEMP/v2/action/msgVpns/${messageVpn}`;

  const msgVpnQueueStartReplayConfig = {
    fromTime,
    replayLogName: replayQueue
  };

  const putRequestConfig = {
    baseUrl: baseUrl,
    basicAuthUsername: sempUsername,
    basicAuthPassword: sempPassword,
    body: {
      ...msgVpnQueueStartReplayConfig
    },
    endpoint: `/queues/${replayQueue}/startReplay`,
    method: "PUT"
  };

  try {
    console.log(`Starting replay on queue "${replayQueue}"...`);
    let res = await makeRequest(putRequestConfig);
    return res;
  } catch (err) {
    console.error(err);
    return false;
  }
}
