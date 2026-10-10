var MajorIncidentDetector = Class.create();
MajorIncidentDetector.prototype = {

    initialize: function() {
        this.threshold = parseInt(gs.getProperty('u_mi.threshold', '5'), 10);
        this.windowMinutes = parseInt(gs.getProperty('u_mi.window_minutes', '10'), 10);
    },

    // Called every time a new incident is created
    evaluate: function(incGr) {
        // Skip if there's no CI, if it's already a major incident, or if it already has a parent
        if (incGr.cmdb_ci.nil() || incGr.u_auto_major_incident == true || !incGr.parent_incident.nil())
            return;

        var ciId = incGr.getValue('cmdb_ci');

        // Step 1: If an open major incident already exists for this CI, just link to it
        var existingMajor = this._findOpenMajor(ciId);
        if (existingMajor) {
            this._linkChild(incGr.getUniqueValue(), existingMajor.getUniqueValue());
            return;
        }

        // Step 2: Count recent incidents on this CI
        var recentIds = this._getRecentIncidents(ciId);
        if (recentIds.length < this.threshold)
            return;

        // Step 3: Threshold reached - create the major incident and link all children
        var majorId = this._createMajor(incGr, recentIds.length);
        for (var i = 0; i < recentIds.length; i++) {
            this._linkChild(recentIds[i], majorId);
        }
    },

    _findOpenMajor: function(ciId) {
        var gr = new GlideRecord('incident');
        gr.addQuery('cmdb_ci', ciId);
        gr.addQuery('u_auto_major_incident', true);
        gr.addActiveQuery();
        gr.setLimit(1);
        gr.query();
        if (gr.next())
            return gr;
        return null;
    },

    _getRecentIncidents: function(ciId) {
        var windowStart = new GlideDateTime();
        windowStart.addSeconds(-60 * this.windowMinutes);

        var ids = [];
        var gr = new GlideRecord('incident');
        gr.addQuery('cmdb_ci', ciId);
        gr.addQuery('u_auto_major_incident', '!=', true);
        gr.addNullQuery('parent_incident');
        gr.addActiveQuery();
        gr.addQuery('sys_created_on', '>=', windowStart);
        gr.query();
        while (gr.next()) {
            ids.push(gr.getUniqueValue());
        }
        return ids;
    },

    _createMajor: function(sampleInc, count) {
        var mi = new GlideRecord('incident');
        mi.initialize();
        mi.short_description = 'MAJOR INCIDENT: ' + count + ' incidents reported on ' + sampleInc.cmdb_ci.getDisplayValue();
        mi.description = 'Auto-created by Major Incident Detector. ' + count +
            ' incidents were logged against this CI within ' + this.windowMinutes + ' minutes.';
        mi.cmdb_ci = sampleInc.cmdb_ci;
        mi.caller_id = sampleInc.caller_id;
        mi.category = sampleInc.category;
        mi.assignment_group = sampleInc.assignment_group;
        mi.impact = 1;
        mi.urgency = 1;
        mi.u_auto_major_incident = true;
        var majorId = mi.insert();

        gs.eventQueue('u_mi.created', mi, String(count), '');
        return majorId;
    },

    _linkChild: function(childId, parentId) {
        var child = new GlideRecord('incident');
        if (child.get(childId)) {
            child.parent_incident = parentId;
            child.work_notes = 'Linked to an auto-detected major incident.';
            child.update();
        }
    },

    // Called when a major incident is resolved
    createProblem: function(majorGr) {
        var prb = new GlideRecord('problem');
        prb.initialize();
        prb.short_description = 'RCA: ' + majorGr.short_description;
        prb.description = 'Root cause analysis for major incident ' + majorGr.number +
            '. Resolution notes: ' + majorGr.close_notes;
        prb.cmdb_ci = majorGr.cmdb_ci;
        prb.assignment_group = majorGr.assignment_group;
        prb.first_reported_by_task = majorGr.sys_id;
        return prb.insert();
    },

    type: 'MajorIncidentDetector'
};
