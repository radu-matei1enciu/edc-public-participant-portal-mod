# Create and tenants and deploy participants

```shell
curl -X POST redline.localhost/api/ui/service-providers/1/tenants -v -d '{"tenantName":"isst","dataspaceInfos":[{"dataspaceId":0}]}' -H "content-type: application/json"
curl -X POST redline.localhost/api/ui/service-providers/1/tenants/1/participants/1/deployments -v -d '{"participantId":1,"identifier":"did:web:identityhub.edc-v.svc.cluster.local%3A7083:isst"}' -H "content-type: application/json"


curl -X POST redline.localhost/api/ui/service-providers/1/tenants -v -d '{"tenantName":"medtech","dataspaceInfos":[{"dataspaceId":0}]}' -H "content-type: application/json"
curl -X POST redline.localhost/api/ui/service-providers/1/tenants/2/participants/2/deployments -v -d '{"participantId":2,"identifier":"did:web:identityhub.edc-v.svc.cluster.local%3A7083:medtech"}' -H "content-type: application/json"
```

## Verify both active
```shell
curl redline.localhost/api/ui/service-providers/1/tenants/1/participants/1 | jq
curl redline.localhost/api/ui/service-providers/1/tenants/2/participants/2 | jq
```



# Seed redline dataspace and partner info

```sql
INSERT INTO dataspace_info_partners (dataspace_info_id, identifier, nickname)
VALUES (1, 'did:web:identityhub.edc-v.svc.cluster.local%3A7083:medtech', 'MedTech');

INSERT INTO dataspace_info_partners (dataspace_info_id, identifier, nickname)
VALUES (2, 'did:web:identityhub.edc-v.svc.cluster.local%3A7083:isst', 'Fraunhofer ISST');
```