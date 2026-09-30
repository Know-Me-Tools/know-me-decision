# Spec Delta

## Purpose

Provide a local decision backend that works immediately after desktop or mobile installation, with an optional explicitly authorized hosted Jev provider and honest platform acceptance boundaries.

## ADDED Requirements

### Requirement: Installed local default works offline
The released application SHALL include all compatible model, tokenizer, runtime, manifest and default-setting assets needed for local inference on each supported Windows, macOS, Linux, Android and iOS target. First launch SHALL require no network, credentials, Python installation, model download, inference server or manual backend configuration. Local-only installations SHALL have no remote inference dependency.

#### Scenario: Fresh installation without connectivity
- **WHEN** a fresh installation on a supported target starts with networking disabled and no previous model cache or provider credentials
- **THEN** a supported local question completes through the real host path with a primitive-specific answer or explicit safety disposition and audit status, without setup or a network attempt

#### Scenario: Invalid installed assets
- **WHEN** an installed model or tokenizer fails trusted-manifest integrity or compatibility checks
- **THEN** inference is unavailable with an explicit local asset error, ordinary action is withheld, and no implicit download or hosted dispatch occurs

### Requirement: Jev enrollment preserves local default and permissions
A valid TypeSafe key SHALL make hosted Jev eligible for explicit selection without changing the default route from local. Hosted dispatch SHALL additionally require trusted grants for approved non-sensitive data and permitted service use. Unknown, PHI and DeviceOnly input SHALL remain local. A missing, revoked or invalid key SHALL NOT prevent local startup or local operation. Distributed app assets SHALL contain no shared provider credential; user keys SHALL be stored through the host's protected secret handling.

#### Scenario: Key supplied without remote selection
- **WHEN** a user supplies a valid key and submits a locally supported question using default settings
- **THEN** the request still uses the local backend and does not reach Jev

#### Scenario: Explicit eligible Jev selection
- **WHEN** an authenticated host selects Jev with a valid key and an applicable trusted grant for approved non-sensitive data
- **THEN** the request can use Jev through the same guards, calibration, outcome and audit contract

#### Scenario: Forbidden remote data or unavailable key
- **WHEN** a request is unknown, PHI or DeviceOnly, or the Jev key is unavailable or rejected
- **THEN** Jev receives no forbidden input and the host uses a permitted local path or explicit Review/refusal without disabling other local requests

### Requirement: Capability limits are observable
The local default SHALL preserve Choice, fractional expected Score and independent Noul semantics within its validated capabilities. The selected Julia deployment SHALL enforce its native 2–20 candidate limit for applicable scoring calls and its validated formatted-input token limit. Unsupported requests SHALL return an explicit native Review/refusal without fabricated probabilities, silent truncation or silent hierarchical decomposition. An explicit eligible remote selection SHALL be evaluated separately under the hosted-dispatch contract.

#### Scenario: Candidate or input overflow
- **WHEN** a local call has 21 choices or its fully formatted input exceeds the validated token limit
- **THEN** the host reports the unsupported capability with no ordinary answer or Act and does not truncate, fabricate a distribution or silently dispatch remotely

#### Scenario: Primitive semantics survive integration
- **WHEN** validated fixtures contain a fractional expected Score and multiple independently true Noul statements
- **THEN** the local host preserves the fractional value and independent statement probabilities rather than rounding the Score or normalizing across statements

### Requirement: Zero setup preserves safety outcomes
Default availability SHALL NOT imply that arbitrary specifications are calibrated. Required tripwires and guards SHALL remain authoritative. Without valid signed in-date pipeline-matching calibration the outcome SHALL be Review or Escalate; Act SHALL also require committed trusted-host audit persistence. Local-backend failure SHALL NOT widen data permissions.

#### Scenario: New uncalibrated specification
- **WHEN** the bundled model scores a new specification without a valid matching calibration artifact
- **THEN** its native result remains Review or Escalate regardless of confidence

#### Scenario: Mandatory safety or persistence failure
- **WHEN** a tripwire fires, a required guard vetoes, or host audit persistence fails
- **THEN** the default backend cannot bypass the existing precedence rules; ordinary Act is withheld on audit failure and urgent escalation remains deliverable with explicit audit-failure status

### Requirement: Platform claims require real release evidence
A platform SHALL be described as shipping with the local default only after fresh-install offline behavior, primitive parity, full host integration, package size, peak memory, cold/warm latency and lifecycle behavior have been measured against predeclared acceptance budgets on its supported release targets. Different precision, tokenizer, weights, runtime or provider configurations SHALL have identified compatibility and calibration evidence. Upstream demonstrations SHALL NOT count as native-app certification.

#### Scenario: Platform or quantization unverified
- **WHEN** only an upstream Python-driven Android result, a desktop result or a different-precision checkpoint has been tested
- **THEN** untested native Android, iOS and other release configurations remain explicitly pending and are not advertised as certified

#### Scenario: Jev integration cannot be exercised
- **WHEN** a release evaluation has no authorized TypeSafe key
- **THEN** the local baseline is tested independently and hosted Jev acceptance remains recorded as blocked or deferred, never passed using a mock or fabricated receipt
