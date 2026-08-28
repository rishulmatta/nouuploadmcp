# Labs plugin

Secondary plugin, gated on Day 4 completion. Present as an unwired skeleton to demonstrate the plugin architecture.

To wire it:
1. Import `labsTools` in `src/App.tsx` and register them when `plugin === 'labs'`.
2. Implement `propose_results`, `propose_reference_range`, `plot_series`, `plot_panel`, `plot_heatmap`, and `propose_diet_plan`.
3. Add lab fixtures to `public/fixtures/labs/`.
