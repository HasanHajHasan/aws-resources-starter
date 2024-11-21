import { getInput, setFailed } from "@actions/core";
import {
  GetResourcesCommand,
  GetResourcesOutput,
  ResourceGroupsTaggingAPIClient,
} from "@aws-sdk/client-resource-groups-tagging-api";
import { startECSServiceTasks } from "./start/ecs";
import { startRDSInstances } from "./start/rds";

async function getAWSResources(): Promise<void> {
  const region: string = getInput('region', { required: true });// "eu-west-1"; //  
  let keysString: string = getInput('keys', { required: true, trimWhitespace: true })//"Environment"; // 
  const valuesString: string = getInput('values', { required: true });//" dev  ";//

  let keys = keysString.split(",");
  for (let i = 0; i < keys.length; i++) {
    keys[i] = keys[i].trim();
    if (keys[i].length == 0)
      setFailed(`keys: Empty value at index ${i} is not accepted`);
  }

  const parsedValues = valuesString.split("|");
  let tagValues: string[][] = [];
  for (let i = 0; i < parsedValues.length; i++) {
    let values = parsedValues[i].split(",");
    for (let j = 0; j < values.length; j++) {
      values[j] = values[j].trim();
      if (values[j].length == 0)
        setFailed(`value: Empty value at index ${i} ${j} is not accepted`);
    }
    tagValues.push(values);
  }
  if (keys.length != tagValues.length)
    setFailed("Keys and Values must be of the same length");
  try {
    const resourceTagClient = new ResourceGroupsTaggingAPIClient({
      region: region,
    });
    const tagFilters = keys.map((key, index) => ({
      Key: key,
      Values: tagValues[index],
    }));
    let resources = [];
    let paginationToken = "";
    let response: GetResourcesOutput;
    do {
      const getResourcesCommand = new GetResourcesCommand({
        TagFilters: tagFilters,
        PaginationToken: paginationToken,
      });
      response = await resourceTagClient.send(getResourcesCommand);
      resources = resources.concat(response.ResourceTagMappingList);
      paginationToken = response.PaginationToken;
    } while (response.PaginationToken != "");

    const resourcesARN = resources.map((resource) => {
      return resource.ResourceARN;
    });
    await startRDSInstances(region, resourcesARN);
    await startECSServiceTasks(region, resourcesARN);
  } catch (error) {
    setFailed(error);
  }
}
getAWSResources();
