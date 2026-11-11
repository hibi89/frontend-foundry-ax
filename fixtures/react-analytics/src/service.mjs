export function createAnalyticsService(transport,session){
  const auth=()=>{if(!session.userId)throw new Error('AUTH_REQUIRED');};
  return {
    load:async ()=>{auth();return transport('/metrics',{method:'GET'});},
    filter:async status=>{auth();if(!['open','closed'].includes(status))throw new Error('INVALID_FILTER');return transport('/metrics',{status});},
    sort:async direction=>{auth();if(!['asc','desc'].includes(direction))throw new Error('INVALID_SORT');return transport('/metrics',{sort:direction});},
    export:async ()=>{auth();if(!session.canExport)throw new Error('EXPORT_FORBIDDEN');return transport('/export',{format:'csv'});},
    audit:async ()=>{auth();if(!session.isAuditor)throw new Error('AUDITOR_REQUIRED');return transport('/audit',{method:'GET'});}
  };
}
