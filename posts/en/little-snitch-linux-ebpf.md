---
title: "Little Snitch for Linux — Making App Traffic Visible with eBPF"
date: "2026-04-09"
summary: "The iconic macOS network monitor arrives on Linux. What eBPF enables, where it falls short, and why the privacy vs security distinction matters."
---

## What Happened

Little Snitch, the long-established macOS network monitoring tool, just released a Linux version. It hit 1071 points on Hacker News — people had been waiting for this.

## What It Does

It shows you which applications are making outbound network connections and lets you block the ones you don't want. Chrome connecting to google.com? Fine. Some unknown process phoning home to tracking.com? Block it.

Simple concept, but knowing what your machine is talking to changes your perspective entirely.

## The Interesting Part: eBPF

The Linux version hooks into the kernel using eBPF (extended Berkeley Packet Filter). This is the same technology powering Cilium (Kubernetes networking), Falco (runtime security), and Tetragon (security observability).

Running inside the kernel means low overhead. No userspace proxy, no performance penalty worth worrying about.

## Honest About Its Limits

The official docs state it plainly:

> Little Snitch for Linux is built for **privacy, not security**.

The macOS version uses deep packet inspection to reliably tie every connection to a process. The Linux version can't do that — eBPF has strict limits on storage size and program complexity. Under heavy traffic, cache tables overflow, and DNS-to-IP mapping relies on heuristics rather than certainty.

For detecting legitimate software phoning home, it works great. For hardening against a determined adversary, it's not the right tool. I appreciate the honesty.

## What Engineers Should Take Away

**eBPF is becoming essential knowledge for infrastructure and security engineers.** Kubernetes networking, runtime security, observability, and now desktop monitoring — all built on eBPF.

Installing Little Snitch and watching your own machine's traffic for an afternoon is a surprisingly effective way to deepen your understanding of networking. You'd be surprised how many engineers don't know what their own machines are talking to.
