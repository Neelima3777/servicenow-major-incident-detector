// Business Rule: MI - Create Problem on Resolve
// Table: Incident | When: before | Update: true
// Conditions: State changes to Resolved AND Auto Major Incident is true
(function executeRule(current, previous) {
    gs.info('MI-PRB: Business rule fired for ' + current.number);

    // Stop if a Problem was already created for this major incident
    var existing = new GlideRecord('problem');
    existing.addQuery('description', 'CONTAINS', current.number.toString());
    existing.query();
    if (existing.hasNext()) {
        gs.info('MI-PRB: Problem already exists for ' + current.number + ', skipping');
        return;
    }

    var prbId = new MajorIncidentDetector().createProblem(current);
    gs.info('MI-PRB: Created problem with sys_id ' + prbId);

    // Only link it if this instance has the Problem field on incidents
    if (current.isValidField('problem_id'))
        current.problem_id = prbId;

    current.work_notes = 'Problem record created automatically for root cause analysis.';
    gs.info('MI-PRB: Finished for ' + current.number);
})(current, previous);
