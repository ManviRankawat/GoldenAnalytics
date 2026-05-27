### Problem Addressed

I aimed to tackle the issue of making state spending data more accessible to non-technical decision-makers. The existing data is overly complex, buried in massive spreadsheets that don’t offer easy insights. I wanted to empower budget managers and agency executives to quickly spot changes in spending and understand the implications without needing technical skills, like SQL. I chose this interactive approach over building deeper analytics tools or static reports because the real gap was clarity and ease of exploration rather than advanced statistical analysis or alerts about spending patterns.

### Tech and Architectural Choices

I built a single-page application using React with a Node/Express backend and PostgreSQL for the database. My choice of PostgreSQL allows for rapid querying thanks to its indexing capabilities, while using raw SQL keeps things efficient for the aggregation tasks I needed. I deferred creating complex analytical tools or static reports, as I wanted to focus on a highly interactive experience. In a production version, I’d consider integrating more advanced forecasting features, but my priority was making it user-friendly for immediate insights.

### AI Usage Log

1. **Interaction**: I asked the AI for suggestions on how to visualize spending trends effectively.
   - **Output**: It presented several chart options and design ideas.
   - **Outcome**: I integrated the idea of using color coding for trends but adjusted the specifics to fit my design style.

2. **Interaction**: I sought help on formulating a question for the chatbot that would assist users looking for spending anomalies.
   - **Output**: The AI provided a generic example question.
   - **Outcome**: I refined the suggestion to better match the specific categories and spending areas relevant to my data.

3. **Interaction**: I inquired about the best practices for implementing change detection in financial data.
   - **Output**: It outlined techniques and potential pitfalls in monitoring year-over-year differences.
   - **Outcome**: I took its advice on using a semantic color-coding strategy but tailored the thresholds based on my dataset's particular context.
