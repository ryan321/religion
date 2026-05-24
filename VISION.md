# Vision Document

## AI-Driven Mastery Learning OS

### (Vendor-Agnostic, Transparent, Supervisor-Controlled)

---

# 1. Purpose

Build a vendor-agnostic AI-driven learning platform that:

* Accepts a defined learning goal
* Diagnoses a student’s current proficiency
* Builds a structured competency graph
* Generates and continuously updates a personalized learning plan
* Delivers adaptive instruction via AI (chat/voice)
* Collects structured evidence of learning
* Verifies proficiency and mastery rigorously
* Optimizes progression toward mastery
* Provides full transparency to supervisors
* Avoids dependency on any single AI vendor

This system is not intended to solve motivation, parenting, or socialization.
It is an instructional optimization engine.

---

# 2. Core Principles

1. Mastery over completion
2. Evidence over assumption
3. Adaptation for efficiency, not comfort
4. Longitudinal student modeling
5. Full supervisor transparency
6. Vendor-agnostic AI layer
7. Versionable standards
8. Data portability

---

# 3. Optimization Target

Primary objective: Proficiency / Mastery

Mastery is defined as:

* Conceptual understanding
* Procedural fluency
* Transfer to novel problems
* Retention over time

The system must not mark mastery without evidence across all four.

---

# 4. System Overview

The platform operates as a closed-loop learning system:

1. Goal Intake
2. Competency Graph Construction
3. Diagnostic Assessment
4. Student State Modeling
5. Learning Plan Generation
6. Instruction Execution
7. Evidence Collection
8. Mastery Verification
9. Retention Scheduling
10. Plan Revision

This loop runs continuously.

---

# 5. Account & Role Architecture

## 5.1 Roles

### Supervisor Account

(Parent / Guardian / Teacher)

* Owns one or more Student accounts
* Defines goals
* Configures constraints
* Sees all transcripts
* Sees internal plans
* Sees mastery evidence
* Can export all data

### Student Account

* Linked to exactly one Supervisor (V1)
* Interacts with AI tutor
* Views simplified progress
* Cannot modify system goals without permission

Relationship:
Supervisor → many Students

---

# 6. Transparency Requirements

Supervisor must be able to view:

## 6.1 Full Transcripts

* Complete AI ↔ Student interaction
* Timestamped
* Searchable
* Exportable

## 6.2 Learning Plan

* Current goal specification
* Active competency graph
* Current mastery state
* Next planned steps
* Rationale for plan decisions

## 6.3 Evidence Records

For each skill:

* Problems solved
* Explanations given
* Transfer attempts
* Retention checks
* Performance metrics

## 6.4 Decision Trace

Clear explanation of why system:

* Switched topics
* Remediated prerequisite
* Delayed advancement
* Scheduled review

Transparency is mandatory.

---

# 7. Goal Engine

## 7.1 GoalSpec Structure

The system must accept:

* Subject
* Target level (Proficient / Mastery)
* Time constraints (optional)
* Age constraints
* Language preference
* Custom constraints (optional)

GoalSpec must be normalized internally.

---

# 8. Competency Graph

Learning is represented as:

Nodes = skills/concepts
Edges = prerequisite relationships

Each node contains:

* Mastery criteria
* Assessment methods
* Error taxonomy
* Retention schedule

Graphs must be:

* Versioned
* Extendable
* Replaceable
* Mappable between versions

Standards (state/national/etc.) may be used as baseline but must not be hardcoded.

---

# 9. Diagnostic Engine

Must:

* Adaptively estimate mastery probability per node
* Detect misconceptions
* Identify prerequisite gaps
* Minimize redundant questioning

Output:
StudentState model with probability scores.

---

# 10. Student State Model

Persistent data structure including:

* Mastery probability per node
* Retention strength
* Evidence history
* Error classifications
* Modality effectiveness signals

Must support longitudinal persistence across years.

---

# 11. Planning Engine

Given:

* GoalSpec
* CompetencyGraph
* StudentState
* Time constraints

Planner must choose:

* Next node
* Instruction method
* Practice volume
* Review injection timing

Planner optimizes:

* Mastery velocity
* Dependency efficiency
* Cognitive load

---

# 12. Instruction Runtime

Interface:

* Chat first
* Voice optional later

Session structure:

1. Retrieval warm-up
2. Instruction / guided exploration
3. Probing
4. Misconception correction
5. Transfer task
6. Evidence logging

System must:

* Require reasoning
* Avoid answer-leading
* Prevent shallow guessing patterns
* Escalate cognitive demand appropriately

---

# 13. Mastery Verification

Proficient:

* Solves varied problems correctly
* Demonstrates procedural fluency

Mastered:

* Explains reasoning clearly
* Applies concept to novel context
* Retains performance after delay

Retention must be validated.

No advancement without evidence.

---

# 14. Retention Modeling

System must:

* Track forgetting curves
* Schedule spaced retrieval
* Downgrade mastery if decay detected
* Re-strengthen weak nodes

Retention is required for mastery status.

---

# 15. Vendor-Agnostic AI Architecture

This is critical.

## 15.1 AI Abstraction Layer

All AI interactions must go through an abstraction layer:

Example services:

* InstructionEngine
* DiagnosticEngine
* PlanningAssistant
* EvaluationEngine
* ContentGenerator

Each service must support:

* Multiple AI providers
* Swappable model configurations
* Local models (future support)
* Open-source models
* API-based commercial models

No direct coupling between business logic and specific vendor APIs.

---

## 15.2 Model Configuration Layer

Supervisor (or admin) must be able to:

* Select AI provider per service
* Change model versions
* Route certain tasks to different models
* Disable external providers if desired

System must support:

* Multi-model orchestration
* Failover routing
* Logging model used per interaction

---

## 15.3 Data Ownership

All transcripts, student data, and mastery models must:

* Be stored independently of AI vendor
* Never require vendor-specific storage
* Be exportable in open formats

---

## 15.4 AI Replaceability Requirement

If an AI vendor disappears, the system must:

* Continue functioning with alternate model
* Preserve all student data
* Preserve competency graphs
* Preserve mastery records

Vendor swap should require minimal refactor.

---

# 16. Data Model (Core Objects)

* Supervisor
* Student
* GoalSpec
* CompetencyGraph (versioned)
* Node
* StudentState
* Plan
* Session
* Transcript
* EvidenceItem
* RetentionRecord
* ModelConfig

---

# 17. Non-Goals

This platform does not aim to:

* Replace socialization
* Replace parenting
* Gamify learning heavily
* Guarantee motivation
* Provide unstructured exploration
* Provide accreditation

---

# 18. Version 1 Scope

Start with:

* One subject (Math recommended)
* One standards-based competency graph
* Supervisor + Student login
* Diagnostic engine
* Node-by-node planner
* Chat-based instruction
* Basic mastery gating
* Transcript logging
* Supervisor dashboard
* AI abstraction layer (at least 2 providers supported)

Voice, multi-subject support, and advanced modeling follow.

---

# 19. Long-Term Vision

The platform becomes:

* A lifelong mastery record
* A portable competency map
* A language-agnostic instructional OS
* A transparent, vendor-neutral AI learning infrastructure

Standards may change.
AI providers may change.
Models may improve.
The system architecture remains stable.
