# Pricing model

Updated July 13, 2026.

This model supports the proposed $9 per month Sketch Forge Pro plan shown on
the landing page. Pro is a planned post-beta product, not a currently available
subscription.

## Hosted AI allowance

The model uses Claude Haiku 4.5 at the published rate of $1 per million input
tokens and $5 per million output tokens. Routine handwriting recognition and
layout cleanup do not need a frontier model by default.

Monthly usage assumption for one active Pro customer:

| Workload                |   Calls |     Input per call |    Output per call |
| ----------------------- | ------: | -----------------: | -----------------: |
| Handwriting recognition |     300 |       1,000 tokens |          80 tokens |
| AI beautify             |      80 |       4,000 tokens |       1,200 tokens |
| **Total**               | **380** | **620,000 tokens** | **120,000 tokens** |

AI cost:

- Input: 0.62 million × $1 = $0.62
- Output: 0.12 million × $5 = $0.60
- Base AI cost = $1.22
- 25% retry and variance reserve = $0.31
- Budgeted AI cost per active Pro customer = **$1.53 per month**

The public plan uses a round allowance of 400 hosted AI actions each month.
Actual token limits should be enforced server-side before the plan launches.

## Platform baseline

Conservative production budget before variable storage and bandwidth:

| Service                       | Monthly budget |
| ----------------------------- | -------------: |
| Vercel Pro                    |            $20 |
| Railway Pro                   |            $20 |
| Neon Launch, typical usage    |            $15 |
| Resend Pro                    |            $20 |
| Domain and monitoring reserve |             $2 |
| **Fixed baseline**            |        **$77** |

At 100 paying customers, the fixed baseline contributes **$0.77 per customer**.
Early in beta, Neon and Resend may stay on free tiers, so this is intentionally
conservative.

## Unit economics at $9

Stripe's standard United States domestic card fee is modeled at 2.9% plus
$0.30:

- Payment fee: $9 × 2.9% + $0.30 = $0.56
- Hosted AI budget = $1.53
- Fixed platform allocation at 100 customers = $0.77
- Total direct cost = **$2.86**
- Contribution before support, tax, and payroll = **$6.14**
- Contribution margin = **68.2%**

This is a planning model, not a guarantee. Recalculate with real token telemetry,
customer geography, taxes, refunds, storage, bandwidth, and support load before
turning on billing.

## Sources

- [Anthropic Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Anthropic vision tokenization](https://platform.claude.com/docs/en/build-with-claude/vision)
- [Vercel pricing](https://vercel.com/pricing)
- [Railway pricing](https://railway.com/pricing)
- [Neon pricing](https://neon.com/pricing)
- [Resend pricing](https://resend.com/docs/knowledge-base/what-is-resend-pricing)
- [Stripe pricing](https://stripe.com/pricing)
