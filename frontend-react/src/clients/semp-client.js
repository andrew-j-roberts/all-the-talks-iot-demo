/**
 * SempClient
 * @author Andrew Roberts
 */

import { env } from "./clients.config";
import { makeRequest } from "./HttpClient";

export async function fetchConnectedClients({ msgVpnName }) {
  const baseUrl = `${env.SEMP_ENDPOINT}/msgVpns/${msgVpnName}`;

  const getRequestParams = {
    baseUrl: baseUrl,
    basicAuthUsername: env.SEMP_USERNAME,
    basicAuthPassword: env.SEMP_PASSWORD,
    endpoint: `/clients`,
    method: "GET"
  };
  try {
    console.log(`Fetching client connections in Msg VPN "${msgVpnName}"...`);
    let res = await makeRequest(getRequestParams);
    return res["data"];
  } catch (err) {
    console.error(err);
    return false;
  }
}
