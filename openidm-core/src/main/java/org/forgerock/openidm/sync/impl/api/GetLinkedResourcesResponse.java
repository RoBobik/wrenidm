/*
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
 * Copyright 2016 ForgeRock AS.
 */

package org.forgerock.openidm.sync.impl.api;

import javax.validation.constraints.NotNull;

import org.forgerock.api.annotations.Description;
import org.forgerock.api.annotations.Title;

/**
 * {@link org.forgerock.openidm.sync.impl.SynchronizationService} getLinkedResources-action response.
 */
@Title("Get Linked Resources Response")
public class GetLinkedResourcesResponse {
    private LinkedResource[] linkedTo;

    /**
     * List of all resources which link to the main object.
     *
     * @return List of all resources which link to the main object.
     */
    @NotNull
    @Description("The list of all resources which link to the main object")
    public LinkedResource[] getLinkedTo() {
        return linkedTo;
    }

    /**
     * Sets list of all resources which link to the main object.
     *
     * @param linkedTo List of all resources which link to the main object.
     */
    public void setLinkedTo(LinkedResource[] linkedTo) {
        this.linkedTo = linkedTo;
    }
}
