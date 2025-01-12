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

/* eslint no-eval: 0 */

define([
    "jquery",
    "underscore",
    "handlebars",
    "org/forgerock/commons/ui/common/util/Constants",
    "org/forgerock/commons/ui/common/main/EventManager",
    "org/forgerock/openidm/ui/common/delegates/SearchDelegate"
], function ($, _, Handlebars, constants, eventManager, searchDelegate) {
    var obj = {};

    obj.resourceCollectionCache = {};

    obj.displayTextDelimiter = ", ";

    obj.getDisplayText = function(prop, item, resourceCollectionIndex){
        var pathToResource = (prop.items) ? prop.items.resourceCollection[resourceCollectionIndex].path : prop.resourceCollection[resourceCollectionIndex].path,
            resourceKey = (prop.items) ? item._ref : pathToResource + "/" + item._id,
            validDisplayProps = _.reject(obj.autocompleteProps(prop, resourceCollectionIndex),function(p){
                return (p && !p.length) || !eval("item." + p);
            }),
            txt = _.map(validDisplayProps, function(p){
                return _.escape(eval("item." + p));
            }).join(obj.displayTextDelimiter);

        if (!obj.resourceCollectionCache[resourceKey]) {
            obj.resourceCollectionCache[resourceKey] = txt;
        }

        return txt;
    };

    obj.autocompleteProps = function(prop, resourceCollectionIndex, showRaw) {
        var fields = (prop.items) ? prop.items.resourceCollection[resourceCollectionIndex].query.fields : prop.resourceCollection[resourceCollectionIndex].query.fields;

        if (showRaw) {
            return fields;
        } else {
            return _.map(fields, function(field) {
                return field.replace("/",".");
            });
        }
    };

    obj.setupAutocompleteField = function(autocompleteField, prop, opts, resourceCollectionIndex, propertyValue) {
        obj.resourceCollectionIndex = resourceCollectionIndex;
        var pathToResource = (prop.items) ? prop.items.resourceCollection[resourceCollectionIndex].path : prop.resourceCollection[resourceCollectionIndex].path,
            initialLoad = true,
            defaultOpts = {
                valueField: '_id',
                searchField: obj.autocompleteProps(prop, resourceCollectionIndex),
                create: false,
                preload: true,
                hideSelected: true,
                placeholder: $.t("templates.admin.ResourceEdit.search",{ objectTitle: prop.title || prop.name }),
                render: {
                    item: function(item, escape) {
                        var txt = obj.getDisplayText(prop, item, resourceCollectionIndex);
                        return "<div>" + txt + "</div>";
                    },
                    option: function(item, escape) {
                        var txt = obj.getDisplayText(prop, item, resourceCollectionIndex);
                        return "<div>" + txt + "</div>";
                    }
                },
                load: function(query, callback) {
                    var queryFilter;

                    if (prop.items) {
                        queryFilter = prop.items.resourceCollection[resourceCollectionIndex].query.queryFilter;
                    } else {
                        queryFilter = prop.resourceCollection[resourceCollectionIndex].query.queryFilter;
                    }

                    searchDelegate.searchResults(pathToResource, obj.autocompleteProps(prop, resourceCollectionIndex, true), query, null, queryFilter).then(function(result) {
                        var convertNestedProps = function(item) {
                                _.each(obj.autocompleteProps(prop, resourceCollectionIndex), function(propName) {
                                    if (propName.indexOf(".") > -1) {
                                        item[propName] = eval("item." + propName);
                                    }
                                });
                                return item;
                            },
                            modifiedResult = _.map(result, function(item){
                                return convertNestedProps(item);
                            });

                        if (prop.parentObjectId) {
                            //filter out any values that are the same as the parentObjectId
                            modifiedResult = _.reject(modifiedResult, function (mr) { return mr._id === prop.parentObjectId; });
                        }

                        callback(modifiedResult);
                    }, function() {
                        callback();
                    });
                },
                onLoad: function(data) {
                    if (initialLoad && propertyValue && !_.isEmpty(propertyValue)){
                        this.addOption(propertyValue);
                        this.setValue(propertyValue._id);
                        initialLoad = false;
                    }
                }
            };

        if (autocompleteField[0].selectize) {
            autocompleteField[0].selectize = null;
            autocompleteField.next().remove();
        }

        autocompleteField.selectize(_.extend({}, defaultOpts, opts || {}));
    };

    obj.getHeaderValues = function(fields, schema) {
        return _.map(fields, function(field) {
            var propField = function() {
                return eval("schema." + field.replace("/",".properties."));
            };

            if (schema && propField() && propField().title && propField().title.length) {
                return propField().title;
            } else {
                return field;
            }
        });
    };

    obj.showResource = function(resourcePath) {
        var args = resourcePath.split("/"),
            routeName = (args[0] !== "system") ? "adminEditManagedObjectView" : "adminEditSystemObjectView";

        if (args.length >= 3) {
            eventManager.sendEvent(constants.ROUTE_REQUEST, {routeName: routeName, args: args});
        }
    };


    /**
     * convertRelationshipTypes loops over every property looking for
     * arrays of relationship types or single value relationship types
     * once found the type is converted to "string" for jsonEditor and the
     * typeRelationship flag is set to true
     *
     * this function is recursive...when a property is an object the function
     * calls itself to deal with cases where relationship types are nested
     *
     * @param {Object[]} properties
     * @returns {Object[]}
     */
    obj.convertRelationshipTypes = function (properties) {
        _.each(properties, function(prop,key) {
            if (prop.type === "object") {
                prop = obj.convertRelationshipTypes(prop.properties);
            }

            if (prop.type === "array" && prop.items) {
                if (prop.items.type === "relationship" && _.has(properties,key)) {
                    prop.items.type = "string";
                    prop.items.typeRelationship = true;
                }
            }

            if (prop.type === "relationship" && _.has(properties,key)) {
                prop.type = "string";
                prop.typeRelationship = true;
            }
        });

        return properties;
    };

    /**
     * getFieldsToExpand loops over every property looking for single value relationship types
     * once found a string of a list of properties defined in the resourceCollection.query.fields property
     * is constructed for the use in the _fields parameter of a query url
     *
     * this function is recursive...when a property is an object the function
     * calls itself to deal with cases where relationship types are nested
     *
     * @param {Object[]} properties
     * @returns {String}
     */
    obj.getFieldsToExpand = function (properties) {
        var fieldsArray = ["*"],
            addFields = function (propName, fields) {
                fieldsArray.push(propName + "/_id");
                _.each(fields, function (field) {
                    if (field.indexOf("/") > 0) {
                        field = field.split("/")[0];
                    }

                    fieldsArray.push(propName + "/" + field);
                });
            };

        _.each(properties, function(prop,key) {
            if (prop.type === "object") {
                prop = obj.getFieldsToExpand(prop.properties);
            }

            if (prop.type === "relationship") {
                if (prop.resourceCollection && prop.resourceCollection.length) {
                    _.map(prop.resourceCollection, function (resourceCollection) {
                        addFields(key, resourceCollection.query.fields);
                    });
                }
            }
        });

        return fieldsArray.join(",");
    };
    /**
     * takes in a relationship object, turns the _ref property into an array,
     * drops off the last array item (the _id of the object), and returns
     * just the path to the resource collection it comes from
     *
     * example: passing in "managed/user/88b0a909-9b19-4bc0-bd83-902ad1d20439"
     *          returns "managed/user"
     *
     *
     * @param {Object} propertyValue
     * @returns {string}
     */
    obj.getPropertyValuePath = function (propertyValue) {
        var propertyValuePathArr = propertyValue._ref.split("/");

        propertyValuePathArr.pop();

        return propertyValuePathArr.join("/");
    };


    /**
     * finds the index of the resource collection in a relationship property's schema definition
     * based on the resource collection's path
     *
     * @param {Object} schema
     * @param {Object} propertyValue
     * @param {string} propName
     * @returns {int}
     */

    obj.getResourceCollectionIndex = function (schema, propertyValuePath, propName) {
        var resourceCollections = schema.properties[propName].resourceCollection,
            resourceCollectionIndex;

        if (schema.properties[propName].items) {
            resourceCollections = schema.properties[propName].items.resourceCollection;
        }

        resourceCollectionIndex = _.findIndex(resourceCollections, _.bind(function (resourceCollection) {
            return resourceCollection.path === propertyValuePath;
        }, this));

        if (resourceCollectionIndex === -1) {
            resourceCollectionIndex = 0;
        }

        return resourceCollectionIndex;
    };

    Handlebars.registerHelper('nestedLookup', function(property,key) {
        return property[key];
    });

    return obj;
});
