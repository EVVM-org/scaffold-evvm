---
sidebar_position: 8
title: Status
---

# Status — `/evvm/status`

A read-only dashboard for inspecting the deployed EVVM stack.

## What you'll find

- **Contract addresses** — every deployed contract with copy-to-clipboard
  badges
- **Admin role** — current admin address (governance owner of Core)
- **Pending proposals** — admin proposals queued via Core's proposal
  surface, with their accept/reject deadlines
- **Era info** — current staking era index and time remaining
- **System metadata** — chain ID, EVVM ID, MATE token address

## When to use it

Mostly for debugging. If something on another page misbehaves, status is
the fastest way to confirm:

- The contract addresses your `.env` has match what's actually deployed
- An admin proposal you submitted earlier hasn't expired yet
- The era hasn't rolled over since you started staking
