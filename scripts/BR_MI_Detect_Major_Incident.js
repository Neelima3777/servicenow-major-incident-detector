// Business Rule: MI - Detect Major Incident
// Table: Incident | When: after | Insert: true
(function executeRule(current, previous) {
    new MajorIncidentDetector().evaluate(current);
})(current, previous);
