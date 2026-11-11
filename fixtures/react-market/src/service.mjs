export function createMarketService(transport,session){
  const access=()=>{if(!session.userId)throw new Error('AUTH_REQUIRED');};
  return {
    search:async term => { access();if(!term.trim())throw new Error('EMPTY_SEARCH');return transport('/talents',{query:term}); },
    profile:async id => {access();if(!Number.isInteger(id)||id<=0)throw new Error('INVALID_ID');return transport(`/talents/${id}`);},
    quote:async (id,cents) => {access();if(!Number.isSafeInteger(cents)||cents<100)throw new Error('INVALID_AMOUNT');return transport('/quotes',{id,cents});},
    approve:async id => {access();if(!session.approver)throw new Error('APPROVAL_REQUIRED');return transport(`/quotes/${id}/approve`,{approver:session.userId});},
    checkout:async quoteId=>{access();if(!session.approver)throw new Error('APPROVAL_REQUIRED');return transport('/checkout',{quoteId,currency:'USD'});}
  };
}
