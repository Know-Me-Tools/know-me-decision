# Spec Delta

## Purpose

Define consistent answer, authorization, evidence, and human-review behavior for the decision proxy across HTTP, MCP, linked hosts, and browser deployments.

## ADDED Requirements

### Requirement: Answers remain distinct from permission to act
Native clients SHALL receive primitive-specific answers and per-question outcomes. Score SHALL preserve fractional expected values; Noul statements SHALL retain independent probabilities. Hosts SHALL act only on an authorized native outcome. Plain Jev compatibility SHALL serve advisory non-clinical requests only and SHALL refuse requests whose required Review or Escalate behavior cannot be enforced by that client.

#### Scenario: Mixed primitive batch
- **WHEN** an authorized native client requests Choice, Score, and multiple Noul statements in one batch
- **THEN** each question retains its answer type and outcome without coercing Score or Noul to a Choice option

#### Scenario: Plain Jev client cannot enforce a safety outcome
- **WHEN** a plain Jev request requires clinical or safety outcome enforcement, or a tripwire requires escalation
- **THEN** the proxy returns an explicit refusal instead of a normal actionable answer and routes the escalation through the trusted host contract when applicable

### Requirement: Trusted authorization bounds every data dispatch
The system SHALL derive permitted destinations from authenticated host policy and trusted provenance before model routing. A classifier SHALL only remove destinations. Unknown provenance, an internal label, a caller header, a provider key, and a BAA alone SHALL NOT authorize egress. Explicit provider selection, fallback, shadow evaluation, telemetry, and synchronization SHALL obey that same boundary. DeviceOnly data SHALL remain on the device.

#### Scenario: Confident sensitivity false negative
- **WHEN** a model labels data public but the host grant excludes hosted destinations
- **THEN** no hosted request occurs, including shadow or fallback requests

#### Scenario: Unknown provenance and forced provider
- **WHEN** a caller requests hosted Jev for data without trusted authorization for that destination
- **THEN** the proxy refuses that dispatch and records the denial without transmitting state

### Requirement: Provider eligibility includes service authorization and scoring evidence
Production provider admission SHALL require evidence permitting the intended service use and evidence of supported scoring semantics. A successful subscription probe SHALL NOT establish production entitlement. Incomplete candidate scores SHALL NOT be converted into a complete distribution by invented floor values or renormalization of the returned subset. Unavailable scores SHALL force abstention or an eligible alternative; approximations SHALL require separately identified evaluation and calibration before use.

#### Scenario: Option missing from top five
- **WHEN** a remote response contains a non-option token and omits a requested option score
- **THEN** the response is marked incomplete and cannot authorize Act from fabricated probability mass

#### Scenario: Token-plan credentials without service permission
- **WHEN** a configured subscription key authenticates but application-backend use lacks documented authorization
- **THEN** the provider remains ineligible for production routing

### Requirement: Calibration evidence represents the deployed pipeline and population
Calibration SHALL bind to deployment and scoring identity, including relevant routing policy, and SHALL be rejected after an incompatible change. Human-labeled sampling SHALL cover Act, Review, and Escalate populations with provenance and held-out evaluation. Synthetic examples SHALL NOT count toward real positive minimums. Minimum sample counts SHALL NOT be reported as proof of deployment recall or zero errors. Insufficient subgroup evidence SHALL NOT inherit a claimed subgroup guarantee from pooled evidence.

#### Scenario: Confident automated error
- **WHEN** an Act is selected for independent human adjudication and found incorrect
- **THEN** its label and sampling provenance enter evaluation even though no user override occurred

#### Scenario: Synthetic positives and changed scoring pipeline
- **WHEN** a dataset reaches the numerical positive minimum only by including synthetic examples, or the scoring pipeline changes incompatibly
- **THEN** the previous artifact does not authorize Act and the unmet evidence condition is exposed

#### Scenario: Sparse subgroup
- **WHEN** a subgroup lacks the required evidence but a pooled threshold exists
- **THEN** the system identifies pooled evidence separately and forces Review where a subgroup floor is required

### Requirement: Guards and audit persistence precede action release
Required guards SHALL run before finalization even after a confident classifier result. The trusted host SHALL require a committed audit receipt before releasing Act. Append failures SHALL be explicit and SHALL NOT fabricate persistence evidence. Urgent escalation SHALL remain deliverable with explicit uncommitted audit status and host incident handling. Streaming progress SHALL NOT authorize action before these conditions hold.

#### Scenario: Guard veto after confident score
- **WHEN** an early scoring stage is confident but a required guard requires review or escalation
- **THEN** the final outcome respects the guard and does not release the earlier Act candidate

#### Scenario: Audit sink unavailable
- **WHEN** persistence fails for an Act candidate
- **THEN** the host withholds Act and reports the persistence failure without a committed receipt

#### Scenario: Crisis during audit failure
- **WHEN** a tripwire fires while audit persistence is unavailable
- **THEN** urgent escalation is delivered with explicit uncommitted status and a host incident path, never reported as successfully audited

### Requirement: Human confirmation uses authenticated host commands
Review confirmation and override SHALL use an authenticated, authorized host command outside model-visible decision MCP tools. The host SHALL bind actor identity and decision reference, persist the label, and perform any separately authorized clinical command. A supplied actor-role string SHALL NOT establish authorization. A host without this integration SHALL expose read-only review or its own review queue.

#### Scenario: Model attempts confirmation
- **WHEN** an MCP caller supplies a clinician role or requests a review mutation without the authenticated human command
- **THEN** the decision surface does not mutate clinical state or record a human confirmation

#### Scenario: Human resolves held draft
- **WHEN** an authorized counselor confirms a held decision through the host review control
- **THEN** the host records the actor and label and separately gates the clinical action

### Requirement: Browser synchronization has its own explicit grant
DeviceOnly browser decisions and derived audit/label data SHALL remain local without synchronization. A profile allowing synchronization SHALL require an explicit host grant for fields, purpose, and destinations and SHALL disclose that data flow separately from inference locality. Browser quantization variants SHALL require their own compatible calibration evidence.

#### Scenario: Browser reconnects
- **WHEN** a DeviceOnly page reconnects after an offline decision
- **THEN** no decision-derived data is uploaded automatically

#### Scenario: Explicitly permitted synchronization
- **WHEN** a separately authorized profile synchronizes selected audit fields
- **THEN** only granted fields reach granted destinations and the operator sees the actual synchronization policy

### Requirement: Compatibility claims follow observed acceptance evidence
The product SHALL distinguish proposed from implemented MCP revisions, transports, capabilities, authentication, and extensions. It SHALL advertise only supported behavior and SHALL validate Jev SSE separately from MCP transport semantics. Production readiness SHALL require the applicable real-host and protocol acceptance evidence, not artifact existence alone.

#### Scenario: Optional extension lacks evidence
- **WHEN** a planned MCP extension has not passed its applicable compatibility checks
- **THEN** it remains unadvertised and documentation reports it as pending
