"""Scraper pipeline for InternshipMatch.

Two data sources:
1. JSearch API — aggregates Indeed, LinkedIn, Glassdoor. Covers the long tail of smaller firms.
2. Career page scrapers — Firecrawl-based, for direct firm career pages. Deeper data.

Both feed into the normalizer, which maps raw data to the Posting model,
then the orchestrator saves to Supabase.
"""
