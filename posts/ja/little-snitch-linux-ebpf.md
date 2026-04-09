---
title: "Little Snitch for Linux -- eBPFでアプリの通信を丸裸にする"
date: "2026-04-09"
summary: "macOSの定番ネットワーク監視ツールがLinuxに。eBPFの可能性と限界、Privacy vs Securityの区別"
---

## 何が起きたか

macOSで長年使われてきたネットワーク監視ツール「Little Snitch」がLinux版をリリースした。Hacker Newsで1071ポイントを獲得。待望のリリースだったことが分かる。

## 何をするツールか

アプリが裏で勝手にどこと通信しているかを可視化し、ブロックできる。

Chromeがgoogle.comに接続 → OK。謎のアプリがtracking.comに接続 → ブロック。それだけのことだが、「何が勝手に通信しているか」を知れるだけで見える世界が変わる。

## 技術的に面白い点: eBPF

Linux版はeBPF（extended Berkeley Packet Filter）でカーネルレベルのネットワークフックを実現している。eBPFはここ数年でセキュリティ監視の主要技術になりつつあり、CiliumやFalco、Tetragonといったツールも同じ基盤を使っている。

カーネル内で動くから速い。ユーザースペースのプロキシを通す方式より圧倒的に低オーバーヘッド。

## 正直な制限の開示

公式ドキュメントが素直に書いている:

> Little Snitch for Linux is built for **privacy, not security**.

macOS版はDeep Packet Inspectionでプロセスと接続を確実に紐づける。Linux版のeBPFにはストレージサイズとプログラム複雑度の制限があり、高トラフィック時にキャッシュが溢れる。DNSとIPの紐づけもヒューリスティック（推測）。

つまり、「正規ソフトのphone homeを検出・ブロックする」には最適だが、「悪意ある攻撃者を止める」には向かない。この区別を明確にしている点に好感を持った。

## エンジニアとして何を考えるか

**eBPFは今後のインフラ・セキュリティエンジニアにとって必修科目になる。** Kubernetesのネットワーキング（Cilium）、ランタイムセキュリティ（Falco）、可観測性（Tetragon）、そしてデスクトップ監視（Little Snitch）。全部eBPFの上に乗っている。

Little Snitchをインストールして自分のLinuxマシンの通信を眺めてみるだけでも、ネットワークの理解が深まる。「自分のマシンが何と喋っているか」を知らないエンジニアは意外と多い。
