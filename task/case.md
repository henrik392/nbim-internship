# Technology and Operations  
## Pre-Case Assessment: LLM-Powered Dividend Reconciliation System  

### Background  
NBIM processes approximately **8,000 dividend events annually** across **9,000+ equity holdings**, requiring **daily reconciliation** between the NBIM internal booking system and data from the global custodian.  
Manual processes are **time-consuming** and **error-prone**.  

Goal: Explore how **Large Language Models (LLMs)** can transform this workflow — from **break detection** to **automated remediation**.

---

### Your Challenge  
Design and implement an **LLM-powered system** to reconcile the provided dividend data.  
Focus on how **LLM agents** can improve the process and dynamically identify issues.

---

### Technical Context  
- **Budget:** $15 USD for LLM API usage (OpenAI or Anthropic)  
- **Models:** Any model tier — focus on **architecture**, not output quality  
- **Data:**  
  - `NBIM_Dividend_Bookings.csv`  
  - `CUSTODY_Dividend_Bookings.csv`  
- **Cases:** 3 dividend events with varying complexity (different `coac_event_key` values in the dataset)

---

### Key Questions to Explore  
1. How can **LLMs classify and prioritize reconciliation breaks**?  
2. What types of **intelligent agents** could automate the entire workflow?  
3. What **safeguards** are needed for **autonomous financial operations**?

---

### Required Deliverables  

#### 1. Working Prototype  
- LLM integration that processes the test data  
- Classification and reconciliation logic  
- Documentation of prompts and approach  

#### 2. Architecture Vision  
- Design for an **agent-based system**

#### 3. Analysis & Recommendations  
- Innovative use cases identified  
- Risk assessment and mitigation strategies  

---

### Presentation (8 Minutes)  
Focus on:  
- Demo of your LLM system (on your local machine)  
- Most innovative ideas for automation  
- Practical next steps  

---

### Evaluation Criteria  
We’re looking for:  
- **Creative thinking** about LLM applications in finance  
- Ability to identify where LLMs add value  
- **Practical solutions** to real operational challenges  
- **Innovation** in approach (not just domain expertise)  
- Understanding of **opportunities, challenges, and risks**

---

### Summary Prompt for LLM  
> Develop an architecture and prototype plan for an **LLM-powered dividend reconciliation system** for NBIM.  
> Include design details, agent roles, prompt engineering, risk management, and automation opportunities.  
> Focus on how to **classify breaks**, **prioritize remediation**, and **propose safeguards** for reliable financial operations within a **$15 API budget**.

---

