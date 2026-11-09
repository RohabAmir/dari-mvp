#!/usr/bin/env bash
# End-to-end smoke test of the three core flows through the REST API.
# Usage: BASE=http://localhost:3000 ./scripts/smoke.sh   (run against a freshly seeded database)
set -euo pipefail
BASE="${BASE:-http://localhost:3000}"
API="$BASE/api/v1"

need() { command -v "$1" >/dev/null || { echo "missing $1"; exit 1; }; }
need curl; need node

j() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);const v=$1;if(v===undefined){console.error('Unexpected response:',s);process.exit(1)}console.log(typeof v==='object'?JSON.stringify(v):v)})"; }
call() { local method=$1 path=$2 token=$3 data=${4:-}; curl -sS -X "$method" "$API$path" -H "content-type: application/json" ${token:+-H "authorization: Bearer $token"} ${data:+-d "$data"}; }
login() { call POST /auth/demo-login "" "{\"email\":\"$1\"}" | j 'o.data.token'; }
step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }

step "Health"
call GET /health "" | j 'o.data.status'

AHMED=$(login ahmed@demo.dari-mvp.ae)
OMAR=$(login omar@saadiyat-horizon.ae)
MARIAM=$(login mariam@registry.dari-mvp.ae)
FATIMA_EID="784-1990-7654321-2"

step "Fee calculator"
call GET "/fees?type=SELL_PURCHASE&price=2000000" "" | j 'o.data.total'

step "Feature 1: developer registers an off-plan first sale"
UNIT=$(call GET "/properties?eligibleFor=FIRST_SALE" "$OMAR" | j 'o.data[0].id')
APP=$(call POST /applications "$OMAR" '{"type":"FIRST_SALE"}' | j 'o.data.id')
call PUT "/applications/$APP/steps/property" "$OMAR" "{\"propertyId\":\"$UNIT\"}" | j 'o.data.currentStep'
call PUT "/applications/$APP/steps/parties" "$OMAR" "{\"emiratesId\":\"$FATIMA_EID\"}" | j 'o.data.data.buyer.name'
echo "low down payment is rejected:"; call PUT "/applications/$APP/steps/contract" "$OMAR" '{"salePrice":1500000,"contractDate":"2026-11-09","downPaymentPct":5}' | j 'o.error.message'
call PUT "/applications/$APP/steps/contract" "$OMAR" '{"salePrice":1500000,"contractDate":"2026-11-09","downPaymentPct":20}' | j 'o.data.feeTotal'
echo "missing documents are rejected:"; call PUT "/applications/$APP/steps/documents" "$OMAR" '{"documents":[{"kind":"SPA","fileName":"spa.pdf","sizeBytes":1000}]}' | j 'o.error.message'
call PUT "/applications/$APP/steps/documents" "$OMAR" '{"documents":[{"kind":"SPA","fileName":"spa.pdf","sizeBytes":1000},{"kind":"BUYER_ID","fileName":"eid.pdf","sizeBytes":1000},{"kind":"PAYMENT_PLAN","fileName":"plan.pdf","sizeBytes":1000}]}' | j 'o.data.currentStep'
call POST "/applications/$APP/submit" "$OMAR" '{"method":"CARD","cardLast4":"1111"}' | j 'o.data.status'

step "Reviewer returns it, developer resubmits, reviewer approves"
echo "applicant cannot approve:"; call POST "/applications/$APP/review" "$OMAR" '{"action":"APPROVE"}' | j 'o.error.status'
echo "return needs a reason:"; call POST "/applications/$APP/review" "$MARIAM" '{"action":"RETURN"}' | j 'o.error.message'
call POST "/applications/$APP/review" "$MARIAM" '{"action":"RETURN","comment":"Please attach the signed payment plan page 2."}' | j 'o.data.status'
call POST "/applications/$APP/submit" "$OMAR" '{}' | j 'o.data.status'
call POST "/applications/$APP/review" "$MARIAM" '{"action":"APPROVE","comment":"All checks passed"}' | j 'o.data.status'
CERT=$(call GET "/applications/$APP" "$MARIAM" | j 'o.data.certificate.number')
echo "certificate issued to buyer: $CERT"
call GET "/applications/$APP" "$MARIAM" | j 'o.data.events.map(e=>e.toStatus).join(" -> ")'

step "Feature 3: public verification and instant title deed"
call GET "/certificates/$CERT" "" | j '[o.data.type,o.data.valid].join(" valid=")'
call GET "/certificates/CRT-NOPE" "" | j 'o.error.status'
READY=$(call GET /properties "$AHMED" | j 'o.data.find(p=>!p.isOffPlan).id')
call POST /certificates "$AHMED" "{\"propertyId\":\"$READY\",\"type\":\"OWNERSHIP\",\"method\":\"APPLE_PAY\"}" | j 'o.data.status'
echo "cannot request for a property you do not own:"; call POST /certificates "$AHMED" "{\"propertyId\":\"$UNIT\",\"type\":\"OWNERSHIP\",\"method\":\"CARD\"}" | j 'o.error.status'

step "Feature 2: escrow totals for the project"
PROJECT=$(call GET /projects "$OMAR" | j 'o.data.find(p=>p.status==="ACTIVE").id')
call GET "/projects/$PROJECT" "$OMAR" | j 'JSON.stringify(o.data.totals)'

printf '\n\033[32mSmoke test passed\033[0m\n'
