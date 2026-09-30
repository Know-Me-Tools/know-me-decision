---
sidebar_position: 2
sidebar_label: Architecture report
title: Architecture and use-case report
description: Crate and sidecar design, the decision cascade, the MCP tool surface, host integration and the product catalogs.
---

# Architecture and use-case report

The architecture report is a standalone KnowMe-branded page with animated diagrams. It covers:

- The planned built-in default: Julia 1 through Rust and embedded native ONNX Runtime, with all assets installed before offline first launch on desktop and mobile. Optional Jev requires a TypeSafe key and trusted host permission; local stays the default.
- The crate and sidecar design, and where each crate runs. Larger local models and browser execution are separate optional profiles; CLM implementation is deferred.
- The decision proxy: the Jev-compatible `/v1/systemone`, native `/v1/decide`, SSE and MCP (rmcp 3.5.0, MCP 2026-07-28), with trusted destination grants and model vetoes across Jev, Laya (MLX, candle, ONNX, browser) and local or remote Qwen.
- The decision cascade and how outcomes are mapped.
- The MCP tool surface, including the `ui://decide/review-card` MCP App.
- Integration with The Boss, UAR, KnowMe and the Prior Authorization Workbench.
- The CounselMe (CM-01…CM-12) and prior-auth (PA-01…PA-11) catalogs.
- The `knowme-decisions` skills marketplace.

**[Open the architecture report →](pathname:///architecture/knowme-decision-layer.html)**

An earlier snapshot is [pinned on IPFS](https://ipfs.prometheusags.ai/ipfs/bafkreidnqfgjwhv2kwnzfcv23u7e6ehyamduswtgwiqmvwydapqa5bxiom).

These are pre-implementation plans and acceptance targets. The immutable IPFS snapshot predates the local built-in-default update; no runtime certification or republication is claimed.

![Architecture report preview](/img/og.png)
