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
    "jquery",
    "underscore",
    "org/forgerock/openidm/ui/admin/mapping/util/MappingAdminAbstractView",
    "org/forgerock/commons/ui/common/main/Configuration",
    "org/forgerock/commons/ui/common/util/Constants",
    "org/forgerock/commons/ui/common/main/EventManager",
    "org/forgerock/openidm/ui/common/delegates/ConfigDelegate",
    "org/forgerock/openidm/ui/admin/mapping/behaviors/PoliciesDialogView",
    "bootstrap-dialog"

], function(
        $, _,
        MappingAdminAbstractView,
        conf,
        constants,
        eventManager,
        ConfigDelegate,
        PoliciesDialogView,
        BootstrapDialog) {

    var PoliciesView = MappingAdminAbstractView.extend({
        element: "#policyPattern",
        noBaseTemplate: true,
        template: "templates/admin/mapping/behaviors/PoliciesTemplate.html",
        events: {
            "change #policyPatterns": "setPattern",
            "click .savePolicy": "save",
            "click .reset": "reset",
            "click .add-policy": "addPolicy",
            "click .delete-policy": "deletePolicy",
            "click .edit-policy": "editPolicy"
        },
        data: {},
        model: {
            successMessage: "triggeredBySituationSaveSuccess",
            currentPattern: "",
            lookup: {
                "SOURCE_MISSING": "Source Missing",
                "ALL_GONE": "All Gone",
                "SOURCE_IGNORED": "Source Ignored",
                "UNQUALIFIED": "Unqualified",
                "AMBIGUOUS": "Ambiguous",
                "FOUND_ALREADY_LINKED": "Found Already Linked",
                "CONFIRMED": "Confirmed",
                "UNASSIGNED": "Unassigned",
                "LINK_ONLY": "Link Only",
                "TARGET_IGNORED": "Target Ignored",
                "MISSING": "Missing",
                "ABSENT": "Absent",
                "FOUND": "Found",
                "IGNORE": "Ignore",
                "DELETE": "Delete",
                "UNLINK": "Unlink",
                "EXCEPTION": "Exception",
                "REPORT": "Report",
                "NOREPORT": "No Report",
                "ASYNC": "Async",
                "CREATE": "Create",
                "UPDATE": "Update"

            },
            sync: {},
            mapping: {},
            mappingName: {},
            saveCallback: {},
            allPatterns: [],
            baseSituations: {}
        },

        render: function(args, callback) {
            this.data = {
                star: "&#9733;",
                hollowStar: "&#9734;",
                policies:[],
                docHelpUrl: constants.DOC_URL,
                patternNames: [],
                situations: [],
                changes: false
            };

            this.model.sync = this.getSyncConfig();
            this.model.mapping = this.getCurrentMapping();
            this.model.mappingName = this.getMappingName();
            this.model.saveCallback = args.saveCallback;
            this.model.renderedPolicies = args.policies || _.clone(this.model.mapping.policies, true) || [];

            if (args.changes) {
                this.data.changes = true;
            }

            this.getPatterns().then(_.bind(function(pattern) {
                this.setPolicies(this.model.renderedPolicies);

                this.parentRender(function () {
                    if (callback) {
                        callback();
                    }

                    this.$el.find(".note").popover({
                        content: function () {
                            return $(this).attr("data-title");
                        },
                        placement: 'top',
                        container: 'body',
                        html: 'true',
                        title: ''
                    });

                    this.$el.find("#policyPatterns").val(this.model.currentPattern);
                    this.$el.find("#patternDescription").text(this.model.allPatterns[this.model.currentPattern].description);
                });
            }, this));
        },

        /**
         * Takes an array of properties, detects if that new properties list differes from the saved version and rerenders the ui with these new values.
         */
        reRender: function(newPolicies) {
            var changes = true,
                newPoliciesFilledIn = [],
                newPoliciesList = [],
                systemPoliciesList = [],
                systemPolicies = {},
                temp;

            _.each(this.model.mapping.policies, function(policy) {
                if (_.isArray(systemPolicies[policy.situation])) {
                    systemPolicies[policy.situation].push(policy);
                } else {
                    systemPolicies[policy.situation] = [policy];
                }
            });

            _.each(newPolicies, function(policy) {
                if (_.isArray(newPoliciesList[policy.situation])) {
                    newPoliciesList[policy.situation].push(policy);
                } else {
                    newPoliciesList[policy.situation] = [policy];
                }
            });

            // Order the properties and fill in any empty situation
            _.each(this.model.baseSituations, function(policy, situationName) {
                if (_.isArray(systemPolicies[situationName])) {
                    _.each(systemPolicies[situationName], function(situation) {
                        temp = _.pick(situation, "action", "situation", "condition", "postAction");
                        if (!_.has(temp, "condition")) {
                            temp.condition = null;
                        }

                        if (!_.has(temp, "postAction")) {
                            temp.postAction = null;
                        }
                        systemPoliciesList = systemPoliciesList.concat(temp);
                    }, this);
                } else {
                    temp = _.pick(policy, "action", "situation", "condition", "postAction");
                    temp.situation = _.invert(this.model.lookup)[temp.situation];
                    systemPoliciesList = systemPoliciesList.concat(temp);
                }

                if (_.isArray(newPoliciesList[situationName])) {
                    _.each(newPoliciesList[situationName], function(situation) {
                        temp = _.pick(situation, "action", "situation", "condition", "postAction");
                        if (!_.has(temp, "condition")) {
                            temp.condition = null;
                        }

                        if (!_.has(temp, "postAction")) {
                            temp.postAction = null;
                        }
                        newPoliciesFilledIn = newPoliciesFilledIn.concat(temp);
                    });
                } else {
                    temp = _.pick(policy, "action", "situation", "condition", "postAction");
                    temp.situation = _.invert(this.model.lookup)[temp.situation];
                    newPoliciesFilledIn = newPoliciesFilledIn.concat(temp);
                }
            }, this);

            if (_.isEqual(newPoliciesFilledIn, systemPoliciesList)) {
                changes = false;
            }

            this.render({
                "saveCallback": this.model.saveCallback,
                "policies": newPolicies,
                "changes": changes
            });
            this.delegateEvents();
        },

        /**
         * Retrieves the list of patterns and creates an array of the default situations in order.
         * All policy sets are configured from this base set of situations.
         */
        getPatterns: function() {
            return $.getJSON("templates/admin/mapping/behaviors/PolicyPatterns.json", _.bind(function(patterns) {
                this.model.allPatterns = patterns;

                _.each(patterns, _.bind(function(pattern, name) {
                    this.data.patternNames.push(name);
                }, this));

                // Gets a copy of a the default action policies and formats it for rendering
                _.each(this.model.allPatterns["Default Actions"].policies, function(policy) {
                    this.model.baseSituations[policy.situation] = {
                        "severity": "",
                        "situation": this.model.lookup[policy.situation],
                        "action": policy.action,
                        "displayAction": this.model.lookup[policy.action],
                        "defaultActionStar": true,
                        "defaultActionHollow": false,
                        "emphasize": false,
                        "condition": null,
                        "displayCondition": "",
                        "postAction": null,
                        "displayPostAction": "",
                        "note": $.t(policy.note),
                        "disabled": true,
                        "options": policy.options
                    };

                    this.data.situations.push({
                        "value": policy.situation,
                        "readable": this.model.lookup[policy.situation]
                    });

                    switch (policy.color) {
                        case "red":
                            this.model.baseSituations[policy.situation].severity = "failure-display";
                            break;
                        case "yellow":
                            this.model.baseSituations[policy.situation].severity = "warning-display";
                            break;
                        case "green":
                            this.model.baseSituations[policy.situation].severity = "success-display";
                            break;
                    }
                }, this);

            }, this));
        },

        /**
         * Take an array of policies and formats them for handlebar template rendering.
         * Some logic is applied to change how information if displayed.
         *
         * Order, note, severity are all decided by the baseSituations defined in the getPatterns function.
         *
         * This transformed array is saved to the data object.
         *
         * @param policies
         */
        setPolicies: function(policies) {
            var action = "",
                condition = "",
                postAction = "",
                tempPolicies = [],
                currentPolicy = [],
                currentPattern = [],
                defaultActionStar = true,
                defaultActionHollow = false,
                emphasize = false,
                patternFound = false,
                policySorter = function(policy) {
                    return policy.situation;
                };

            if (policies.length === 0) {
                policies = this.model.allPatterns["Default Actions"].policies;
            }

            _.each(policies, function (policy) {
                action = "";
                condition = "";
                postAction = "";
                defaultActionStar = true;
                defaultActionHollow = false;
                emphasize = false;

                _.each(this.model.lookup.situations, function(val, key) {
                    if (val === policy.situation) {
                        policy.situation = key;
                    }
                });

                if (_.isObject(policy.action) && _.has(policy.action, "file") && policy.action.file === "workflow/triggerWorkflowFromSync.js") {

                    if (_.has(policy.action, "globals") && _.has(policy.action.globals, "workflowReadable")) {
                        action = policy.action.globals.workflowReadable;
                    } else {
                        action = $.t("templates.situationalPolicies.workflow");
                    }

                    defaultActionStar = false;
                    emphasize = true;

                } else if (_.isObject(policy.action) && _.has(policy.action, "type")) {
                    action = policy.action.type;
                    defaultActionStar = false;
                    emphasize = true;

                } else if (_.isString(policy.action)) {
                    action = this.model.lookup[policy.action] || policy.action;

                    if (_.indexOf(this.model.baseSituations[policy.situation].options, policy.action) >= 0) {
                        defaultActionHollow = true;
                        defaultActionStar = false;
                    } else if (this.model.baseSituations[policy.situation].action !== policy.action) {
                        defaultActionStar = false;
                    }
                }

                if (_.isObject(policy.condition) && _.has(policy.condition, "type")) {
                    condition = "(" + policy.condition.type + ")";
                } else if (_.isString(policy.condition) && policy.condition.length > 0) {
                    condition = "(" + policy.condition + ")";
                }

                if (_.isObject(policy.postAction) && _.has(policy.postAction, "type")) {
                    postAction = "(" + policy.postAction.type + ")";
                }

                if (!_.isArray(tempPolicies[policy.situation])) {
                    tempPolicies[policy.situation] = [];
                }
                tempPolicies[policy.situation].push({
                    "severity": this.model.baseSituations[policy.situation].severity,
                    "situation": this.model.lookup[policy.situation],
                    "action": policy.action,
                    "displayAction": action,
                    "defaultActionStar": defaultActionStar,
                    "defaultActionHollow": defaultActionHollow,
                    "emphasize": emphasize,
                    "condition": policy.condition,
                    "displayCondition": condition,
                    "postAction": policy.postAction,
                    "displayPostAction": postAction,
                    "note": this.model.baseSituations[policy.situation].note,
                    "disabled": true
                });

            }, this);

            // Order the properties and fill in any empty situation
            _.each(this.model.baseSituations, function(policy, situationName) {
                if (_.isArray(tempPolicies[situationName])) {
                    if (tempPolicies[situationName].length > 1 ) {
                        _.each(tempPolicies[situationName], function(policy, index) {
                            tempPolicies[situationName][index].disabled = false;
                        });
                    }
                    this.data.policies = this.data.policies.concat(tempPolicies[situationName]);
                } else {
                    this.data.policies = this.data.policies.concat(policy);
                }
            }, this);

            _.each(this.model.allPatterns, function(pattern, name) {
                currentPattern = _.chain(pattern.policies)
                    .map(function(policy) {
                        return _.pick(policy, "action", "situation");
                    })
                    .sortBy(policySorter)
                    .value();

                currentPolicy = _.chain(policies)
                    .map(function(policy) {
                        return _.pick(policy, "action", "situation");
                    })
                    .sortBy(policySorter)
                    .value();

                if (_.isEqual(currentPattern, currentPolicy)) {
                    patternFound = true;
                    this.model.currentPattern = name;
                }
            }, this);

            if (!patternFound) {
                this.model.currentPattern = "Custom";
            }
        },

        /**
         * When the select box for policy patterns changes the ui is re-rendered to reflect the new policies
         */
        setPattern: function(e) {
            var btns = [
                {
                    label: $.t("common.form.cancel"),
                    action: _.bind(function (dialogRef) {
                        this.reRender(this.model.renderedPolicies);
                        dialogRef.close();
                    }, this)
                },
                {
                    label: $.t("common.form.continue"),
                    cssClass: "btn-primary",
                    action: _.bind(function (dialogRef) {
                        if (e.target.value !== "Custom") {
                            this.reRender(this.model.allPatterns[e.target.value].policies);
                            this.model.currentPattern = e.target.value;
                        }
                        dialogRef.close();
                    }, this)
                }
            ];

            if (this.data.changes) {
                this.setElement($('<div id="ConfirmPatternChange"></div>'));
                $('#dialogs').append(this.model.currentDialog);
                BootstrapDialog.show({
                    title: $.t("templates.situationalPolicies.confirmChange"),
                    type: BootstrapDialog.TYPE_DEFAULT,
                    message: $("<div id='dialogDetails'>" + $.t("templates.situationalPolicies.confirmChangeMsg") + "</div>"),
                    buttons: btns
                });
            } else {
                if (e.target.value !== "Custom") {
                    this.reRender(this.model.allPatterns[e.target.value].policies);
                }
            }
        },

        deletePolicy: function(event) {
            event.preventDefault();

            _.each(this.$el.find("#situationalPolicies table .event-hook .delete-policy"), function(deleteButton, index) {
                if (deleteButton === event.currentTarget && !$(event.currentTarget).hasClass("disabled")) {
                    _.each(this.data.policies, function(policy, index) {
                        this.data.policies[index] = _.pick(policy, "action", "situation", "condition", "postAction");
                        this.data.policies[index].situation = _.invert(this.model.lookup)[this.data.policies[index].situation];
                    }, this);

                    this.data.policies.splice(index, 1);
                    this.reRender(this.data.policies);
                }
            }, this);
        },

        addPolicy: function(e) {
            e.preventDefault();

            PoliciesDialogView.render({
                "mappingName" : this.model.mappingName,
                "mapProps": this.model.mapping.properties,
                "situation": this.$el.find(".situation-list").val(),
                "edit": false,
                "policy": null,
                "basePolicy": this.model.baseSituations[this.$el.find(".situation-list").val()],
                "lookup": this.model.lookup,
                "saveCallback": _.bind(function(policy) {
                    this.model.renderedPolicies.push(policy);
                    this.reRender(this.model.renderedPolicies);
                }, this)
            });
        },

        editPolicy: function(event) {
            event.preventDefault();

            _.each(this.$el.find("#situationalPolicies table .event-hook .edit-policy"), function(editButton, index) {
                if (editButton === event.currentTarget) {
                    PoliciesDialogView.render({
                        "mappingName" : this.model.mappingName,
                        "mapProps": this.model.mapping.properties,
                        "situation": _.invert(this.model.lookup)[this.data.policies[index].situation],
                        "edit": true,
                        "policy": this.data.policies[index],
                        "basePolicy": this.model.baseSituations[_.invert(this.model.lookup)[this.data.policies[index].situation]],
                        "lookup": this.model.lookup,
                        "saveCallback": _.bind(function(policy) {
                            _.each(this.data.policies, function(policy, index) {
                                this.data.policies[index] = _.pick(policy, "action", "situation", "condition", "postAction");
                                this.data.policies[index].situation = _.invert(this.model.lookup)[this.data.policies[index].situation];
                            }, this);

                            this.data.policies[index] = policy;

                            this.reRender(this.data.policies);
                        }, this)
                    });
                }
            }, this);
        },

        reset: function() {
            this.reRender(this.model.mapping.policies);
        },

        save: function() {
            var policies = [],
                _this = this;

            _.each(this.model.renderedPolicies, function(policy) {
                policy = _.pick(policy, "action", "situation", "postAction", "condition");

                if (!policy.condition) {
                    delete policy.condition;
                }

                if (!policy.postAction) {
                    delete policy.postAction;
                }

                policies.push(policy);
            }, this);

            this.model.mapping.policies = policies;

            this.AbstractMappingSave(this.model.mapping, _.bind(function() {
                eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "syncPolicySaveSuccess");
                _this.model.saveCallback();
            }, this));
        }
    });

    return new PoliciesView();
});
