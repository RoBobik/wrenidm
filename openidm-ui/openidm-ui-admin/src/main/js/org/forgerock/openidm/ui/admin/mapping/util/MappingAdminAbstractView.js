/**
 * The contents of this file are subject to the terms of the Common Development and
 * Distribution License (the License). You may not use this file except in compliance with the
 * License.
 *
 * You can obtain a copy of the License at legal/CDDLv1.0.txt. See the License for the
 * specific language governing permission and limitations under the License.
 *
 * When distributing Covered Software, include this CDDL Header Notice in each file and include
 * the License file at legal/CDDLv1.0.txt. If applicable, add the following below the CDDL
 * Header, with the fields enclosed by brackets [] replaced by your own identifying
 * information: "Portions copyright [year] [name of copyright owner]".
 *
 * Copyright 2015-2016 ForgeRock AS.
 */

define([
    "underscore",
    "org/forgerock/openidm/ui/admin/util/AdminAbstractView",
    "org/forgerock/openidm/ui/admin/delegates/SyncDelegate",
    "org/forgerock/openidm/ui/common/delegates/ConfigDelegate"

], function(_,
        AdminAbstractView,
        SyncDelegate,
        ConfigDelegate) {

    var currentMapping = {},
        syncConfig = {},
        numRepresentativeProps = 4,
        recon = null,
        syncCanceled = null,
        runSync = _.noop(),

        MappingAdminAbstractView = AdminAbstractView.extend({
            getCurrentMapping: function() {
                if (currentMapping.recon) {
                    delete currentMapping.recon;
                }

                return _.clone(currentMapping, true);
            },

            getSyncConfig: function() {
                return _.clone(syncConfig, true);
            },

            getRecon: function() {
                return _.clone(recon, true);
            },

            getSyncNow: function() {
                return runSync;
            },

            getSyncCanceled: function() {
                return _.clone(syncCanceled, true);
            },

            getMappingName: function() {
                if (currentMapping) {
                    return currentMapping.name;
                } else {
                    return undefined;
                }
            },

            getNumRepresentativeProps: function() {
                return numRepresentativeProps;
            },

            setNumRepresentativeProps: function(num) {
                numRepresentativeProps = num;
                return num;
            },

            setCurrentMapping: function(mapping) {
                if (mapping.recon) {
                    delete mapping.recon;
                }

                currentMapping = mapping;
                return mapping;
            },

            setSyncConfig: function(sync) {
                syncConfig = sync;
                return sync;
            },

            setRecon: function(data) {
                recon = data;
                return data;
            },

            setSyncNow: function(syncNow) {
                runSync = syncNow;
                return syncNow;
            },

            setSyncCanceled: function(canceled) {
                syncCanceled = canceled;
                return canceled;
            },

            AbstractMappingSave: function(mapping, callback) {
                var i = _.findIndex(syncConfig.mappings, {name: mapping.name});

                if (i >= 0) {
                    currentMapping = syncConfig.mappings[i] = mapping;
                    ConfigDelegate.updateEntity("sync", {"mappings": syncConfig.mappings}).then(_.bind(callback, this));
                }
            }
        });

    return MappingAdminAbstractView;
});
