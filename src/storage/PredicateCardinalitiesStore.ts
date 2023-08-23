import {
  ChangeMap,
  Conditions,
  PassthroughStore,
  Patch,
  Representation,
  ResourceIdentifier,
  ResourceStore
} from "@solid/community-server";
import {PredicateCardinalitiesHandler} from "../PredicateCardinalitiesHandler";

export class PredicateCardinalitiesStore extends PassthroughStore {
  private readonly handler: PredicateCardinalitiesHandler;

  public constructor(source: ResourceStore, handler: PredicateCardinalitiesHandler) {
    super(source);
    this.handler = handler;
  }

  public async addResource(container: ResourceIdentifier, representation: Representation, conditions?: Conditions): Promise<ChangeMap> {
    console.log("PredicateCardinalitiesStore.addResource");
    // TODO: Add cardinalities to the cache.

    return super.addResource(container, representation, conditions);
  }

  public async deleteResource(identifier: ResourceIdentifier, conditions?: Conditions): Promise<ChangeMap> {
    console.log("PredicateCardinalitiesStore.deleteResource");
    // TODO: Remove cardinalities from the cache.

    return super.deleteResource(identifier, conditions);
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch, conditions?: Conditions): Promise<ChangeMap> {
    console.log("PredicateCardinalitiesStore.modifyResource");
    // TODO: Update cardinalities in the cache.

    return super.modifyResource(identifier, patch, conditions);
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation, conditions?: Conditions): Promise<ChangeMap> {
    console.log("PredicateCardinalitiesStore.setRepresentation");
    // TODO: Update cardinalities in the cache.

    return super.setRepresentation(identifier, representation, conditions);
  }
}
