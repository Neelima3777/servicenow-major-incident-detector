// Scheduled Job: MI - Stakeholder Updates
// Run: Periodically, every 30 minutes
var mi = new GlideRecord('incident');
mi.addQuery('u_auto_major_incident', true);
mi.addActiveQuery();
mi.addQuery('state', '!=', 6); // 6 = Resolved
mi.query();

while (mi.next()) {
    var childCount = new GlideAggregate('incident');
    childCount.addQuery('parent_incident', mi.getUniqueValue());
    childCount.addAggregate('COUNT');
    childCount.query();
    var count = childCount.next() ? childCount.getAggregate('COUNT') : '0';

    gs.eventQueue('u_mi.stakeholder_update', mi, count, '');
    mi.work_notes = 'Scheduled stakeholder update sent (' + count + ' linked incidents).';
    mi.update();
}
