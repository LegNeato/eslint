/**
 * @fileoverview Internal rule to prevent missing or invalid meta property in core rules.
 * @author Vitor Balocco
 */

"use strict";

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

/**
 * Gets the property of the Object node passed in that has the name specified.
 *
 * @param {string} property Name of the property to return.
 * @param {ASTNode} node The ObjectExpression node.
 * @returns {ASTNode} The Property node or null if not found.
 */
function getPropertyFromObject(property, node) {
    var properties = node.properties;

    for (var i = 0; i < properties.length; i++) {
        if (properties[i].key.name === property) {
            return properties[i];
        }
    }

    return null;
}

/**
 * Extracts the `meta` property from the ObjectExpression that all rules export.
 *
 * @param {ASTNode} exportsNode ObjectExpression node that the rule exports.
 * @returns {ASTNode} The `meta` Property node or null if not found.
 */
function getMetaPropertyFromExportsNode(exportsNode) {
    return getPropertyFromObject("meta", exportsNode);
}

/**
 * Whether this `meta` ObjectExpression has a `docs` property defined or not.
 *
 * @param {ASTNode} metaPropertyNode The `meta` ObjectExpression for this rule.
 * @returns {boolean} `true` if a `docs` property exists.
 */
function hasMetaDocs(metaPropertyNode) {
    return Boolean(getPropertyFromObject("docs", metaPropertyNode.value));
}

/**
 * Whether this `meta` ObjectExpression has a `docs.description` property defined or not.
 *
 * @param {ASTNode} metaPropertyNode The `meta` ObjectExpression for this rule.
 * @returns {boolean} `true` if a `docs.description` property exists.
 */
function hasMetaDocsDescription(metaPropertyNode) {
    var metaDocs = getPropertyFromObject("docs", metaPropertyNode.value);

    return metaDocs && getPropertyFromObject("description", metaDocs.value);
}

/**
 * Whether this `meta` ObjectExpression has a `docs.category` property defined or not.
 *
 * @param {ASTNode} metaPropertyNode The `meta` ObjectExpression for this rule.
 * @returns {boolean} `true` if a `docs.category` property exists.
 */
function hasMetaDocsCategory(metaPropertyNode) {
    var metaDocs = getPropertyFromObject("docs", metaPropertyNode.value);

    return metaDocs && getPropertyFromObject("category", metaDocs.value);
}

/**
 * Whether this `meta` ObjectExpression has a `docs.recommended` property defined or not.
 *
 * @param {ASTNode} metaPropertyNode The `meta` ObjectExpression for this rule.
 * @returns {boolean} `true` if a `docs.recommended` property exists.
 */
function hasMetaDocsRecommended(metaPropertyNode) {
    var metaDocs = getPropertyFromObject("docs", metaPropertyNode.value);

    return metaDocs && getPropertyFromObject("recommended", metaDocs.value);
}

/**
 * Whether this `meta` ObjectExpression has a `schema` property defined or not.
 *
 * @param {ASTNode} metaPropertyNode The `meta` ObjectExpression for this rule.
 * @returns {boolean} `true` if a `schema` property exists.
 */
function hasMetaSchema(metaPropertyNode) {
    return getPropertyFromObject("schema", metaPropertyNode.value);
}

/**
 * Whether this `meta` ObjectExpression has a `fixable` property defined or not.
 *
 * @param {ASTNode} metaPropertyNode The `meta` ObjectExpression for this rule.
 * @returns {boolean} `true` if a `fixable` property exists.
 */
function hasMetaFixable(metaPropertyNode) {
    return getPropertyFromObject("fixable", metaPropertyNode.value);
}

/**
 * Checks the validity of the meta definition of this rule and reports any errors found.
 *
 * @param {RuleContext} context The ESLint rule context.
 * @param {ASTNode} exportsNode ObjectExpression node that the rule exports.
 * @param {boolean} ruleIsFixable whether the rule is fixable or not.
 * @returns {void}
 */
function checkMetaValidity(context, exportsNode, ruleIsFixable) {
    var metaProperty = getMetaPropertyFromExportsNode(exportsNode);

    if (!metaProperty) {
        context.report(exportsNode, "Rule is missing a meta property.");
        return;
    }

    if (!hasMetaDocs(metaProperty)) {
        context.report(metaProperty, "Rule is missing a meta.docs property.");
        return;
    }

    if (!hasMetaDocsDescription(metaProperty)) {
        context.report(metaProperty, "Rule is missing a meta.docs.description property.");
        return;
    }

    if (!hasMetaDocsCategory(metaProperty)) {
        context.report(metaProperty, "Rule is missing a meta.docs.category property.");
        return;
    }

    if (!hasMetaDocsRecommended(metaProperty)) {
        context.report(metaProperty, "Rule is missing a meta.docs.recommended property.");
        return;
    }

    if (!hasMetaSchema(metaProperty)) {
        context.report(metaProperty, "Rule is missing a meta.schema property.");
        return;
    }

    if (ruleIsFixable && !hasMetaFixable(metaProperty)) {
        context.report(metaProperty, "Rule is fixable, but is missing a meta.fixable property.");
        return;
    }
}

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
    meta: {
        docs: {
            description: "enforce correct use of `meta` property in core rules",
            category: "Internal",
            recommended: false
        },

        schema: []
    },

    create: function(context) {
        var metaExportsValue;
        var ruleIsFixable = false;

        return {
            AssignmentExpression: function(node) {
                if (node.left &&
                    node.right &&
                    node.left.type === "MemberExpression" &&
                    node.left.object.name === "module" &&
                    node.left.property.name === "exports") {

                    metaExportsValue = node.right;
                }
            },

            CallExpression: function(node) {

                // If the rule has a call for `context.report` and a property `fix`
                // is being passed in, then we consider that the rule is fixable.
                //
                // Note that we only look for context.report() calls in the new
                // style (with single MessageDescriptor argument), because only
                // calls in the new style can specify a fix.
                if (node.callee.type === "MemberExpression" &&
                    node.callee.object.type === "Identifier" &&
                    node.callee.object.name === "context" &&
                    node.callee.property.type === "Identifier" &&
                    node.callee.property.name === "report" &&
                    node.arguments.length === 1 &&
                    node.arguments[0].type === "ObjectExpression") {

                    if (getPropertyFromObject("fix", node.arguments[0])) {
                        ruleIsFixable = true;
                    }
                }
            },

            "Program:exit": function() {
                checkMetaValidity(context, metaExportsValue, ruleIsFixable);
            }
        };
    }
};
