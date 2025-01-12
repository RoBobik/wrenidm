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
 * Copyright 2011-2016 ForgeRock AS.
 */

define([
    "jquery",
    "underscore",
    "org/forgerock/commons/ui/common/util/Constants",
    "org/forgerock/commons/ui/common/main/AbstractDelegate",
    "org/forgerock/openidm/ui/common/delegates/ConfigDelegate",
    "org/forgerock/commons/ui/common/components/Messages",
    "org/forgerock/commons/ui/common/util/ObjectUtil"
], function($, _, constants, AbstractDelegate, configDelegate, messagesManager, ObjectUtil) {

    var obj = new AbstractDelegate(constants.host + "/openidm/");

    obj.getSchema = function(args){
        var objectType = args[0],
            objectName = args[1],
            objectName2 = args[2];

        if (objectType === "managed") {
            return configDelegate.readEntity("managed").then(function(managed){
                var managedObject = _.findWhere(managed.objects,{ name: objectName });

                if (managedObject){
                    if (managedObject.schema){
                        managedObject.schema.allSchemas = managed.objects;
                        return managedObject.schema;
                    } else {
                        return false;
                    }
                } else {
                    return "invalidObject";
                }
            });
        } else if (objectType === "system") {
            return obj.getProvisioner(objectType, objectName).then(function(prov){
                var schema;

                if (prov.objectTypes){
                    schema = prov.objectTypes[objectName2];
                    if (schema){
                        schema.title = objectName;
                        return schema;
                    } else {
                        return false;
                    }
                } else {
                    return "invalidObject";
                }
            });
        } else {
            return $.Deferred().resolve({});
        }
    };

    obj.serviceCall = function (callParams) {
        callParams.errorsHandlers = callParams.errorsHandlers || {};
        callParams.errorsHandlers.policy = {
            status: 403,
            event: constants.EVENT_POLICY_FAILURE
        };

        return AbstractDelegate.prototype.serviceCall.call(this, callParams);
    };

    obj.createResource = function (serviceUrl) {
        return AbstractDelegate.prototype.createEntity.apply(_.extend({}, AbstractDelegate.prototype, this, {"serviceUrl": serviceUrl}), _.toArray(arguments).slice(1));
    };
    obj.readResource = function (serviceUrl) {
        return AbstractDelegate.prototype.readEntity.apply(_.extend({}, AbstractDelegate.prototype, this, {"serviceUrl": serviceUrl}), _.toArray(arguments).slice(1));
    };
    obj.updateResource = function (serviceUrl) {
        return AbstractDelegate.prototype.updateEntity.apply(_.extend({}, AbstractDelegate.prototype, this, {"serviceUrl": serviceUrl}), _.toArray(arguments).slice(1));
    };
    obj.deleteResource = function (serviceUrl, id, successCallback, errorCallback) {
        var callParams = {
            serviceUrl: serviceUrl, url: "/" + id,
            type: "DELETE",
            success: successCallback,
            error: errorCallback,
            errorsHandlers: {
                "Conflict": {
                    status: 409
                }
            },
            headers: {
                "If-Match": "*"
            }
        };

        return obj.serviceCall(callParams).fail(function(err){
            var response = err.responseJSON;
            if (response.code === 409) {
                messagesManager.messages.addMessage({"type": "error", "message": response.message});
            }
        });
    };
    obj.patchResourceDifferences = function (serviceUrl, queryParameters, oldObject, newObject, successCallback, errorCallback) {
        var patchDefinition = ObjectUtil.generatePatchSet(newObject, oldObject);
        
        return AbstractDelegate.prototype.patchEntity.apply(_.extend({}, AbstractDelegate.prototype, this, {"serviceUrl": serviceUrl}), [queryParameters, patchDefinition, successCallback, errorCallback]);
    };

    obj.getServiceUrl = function(args) {
        var url = "/" + constants.context + "/" + args[0] + "/" + args[1];

        if (args[0] === "system") {
            url += "/" + args[2];
        }

        return url;
    };

    obj.searchResource = function(filter, serviceUrl) {
        return obj.serviceCall({
            url: serviceUrl +"?_queryFilter="+filter
        });
    };

    obj.getProvisioner = function(objectType, objectName) {
        return obj.serviceCall({
            serviceUrl: obj.serviceUrl + objectType + "/" + objectName,
            url: "?_action=test",
            type: "POST"
        }).then(function(connector) {
            var config = connector.config.replace("config/","");

            return configDelegate.readEntity(config);
        });
    };

    obj.linkedView = function(id, resourcePath) {
        return obj.serviceCall({
            serviceUrl: constants.host + "/openidm/endpoint/linkedView/" + resourcePath,
            url: id,
            type: "GET"
        });
    };

    obj.queryStringForSearchableFields = function (searchFields, query) {
        var queryFilter = "",
            queryFilterArr = [];
        /*
         * build up the queryFilterArr based on searchFields
         */
        _.each(searchFields, function (field) {
            queryFilterArr.push(field + " sw \"" + query + "\"");
        });

        queryFilter = queryFilterArr.join(" or ") + "&_pageSize=10&_fields=*";

        return queryFilter;
    };

    obj.getResource = function (url) {
        return obj.serviceCall({ url: url });
    };

    return obj;
});
