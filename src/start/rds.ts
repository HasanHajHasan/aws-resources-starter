import { DescribeDBInstancesCommand,RDSClient, StopDBInstanceCommand,StartDBInstanceCommand } from "@aws-sdk/client-rds";


export async function startRDSInstances(region: string, resourcesARN: string[]) {
    const rdsClient = new RDSClient({
        region: region,
    });
    try {
        if (!resourcesARN.length) {
            console.log("No resources found with the specified tags.");
            return;
        }

        for (const resourceARN of resourcesARN) {
            if (resourceARN.startsWith("arn:aws:rds:")) {
                const dbInstanceIdentifier = resourceARN.split(":").pop().split("/").pop();

                const describeCommand = new DescribeDBInstancesCommand({
                    DBInstanceIdentifier: dbInstanceIdentifier,
                });
                const describeResponse = await rdsClient.send(describeCommand);
                const instanceStatus = describeResponse.DBInstances[0].DBInstanceStatus;

                if(instanceStatus.toLocaleLowerCase() != "starting") break;
                const startCommand = new StartDBInstanceCommand({
                    DBInstanceIdentifier: dbInstanceIdentifier,
                });

                await rdsClient.send(startCommand);
                
                console.log(`RDS instance ${dbInstanceIdentifier} start command issued.`);
            } 
        }
    } catch (error) {
        console.error("Error stopping RDS instances:", error);
    }
}