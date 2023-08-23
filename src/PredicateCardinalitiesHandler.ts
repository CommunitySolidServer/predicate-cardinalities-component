import {
  AuxiliaryStrategy,
  INTERNAL_QUADS,
  isContainerPath,
  KeyValueStorage,
  LDP,
  readableToQuads,
  ResourceStore
} from "@solid/community-server";

export class PredicateCardinalitiesHandler {
  private readonly keyValueStorage: KeyValueStorage<string, unknown>;
  private readonly auxiliaryStrategy: AuxiliaryStrategy;

  private readonly PREFIX = "predicate_cardinalities_";

  public constructor(keyValueStorage: KeyValueStorage<string, unknown>, auxiliaryStrategy: AuxiliaryStrategy) {
    this.keyValueStorage = keyValueStorage;
    this.auxiliaryStrategy = auxiliaryStrategy;
  }

  public async isInitialized(): Promise<boolean> {
    console.log("PredicateCardinalitiesHandler.isInitialized");
    return (await this.keyValueStorage.has(this.PREFIX)) && (await this.keyValueStorage.get(this.PREFIX) as any)["initialized"] || false;
  }

  public async initialize(baseUrl: string, store: ResourceStore): Promise<void> {
    await this.keyValueStorage.set(this.PREFIX, {"initialized": false});  // TODO: remove this line
    console.log("PredicateCardinalitiesHandler.initialize");
    if (await this.isInitialized()) {
      return;
    }

    await this.processContainer(baseUrl, store);

    await this.keyValueStorage.set(this.PREFIX, {"initialized": true});
  }

  public async processContainer(path: string, store: ResourceStore): Promise<void> {
    console.log("PredicateCardinalitiesHandler.processContainer");
    const container = await store.getRepresentation({path: path}, {type: {[INTERNAL_QUADS]: 1}});
    for await (const child of container.metadata.quads(container.metadata.identifier, LDP.terms.contains, null, null)) {
      if (isContainerPath(child.object.value)) {
        await this.processContainer(child.object.value, store);
      } else {
        await this.processResource(child.object.value, store);
      }
    }
    container.data.destroy();
  }

  public async processResource(path: string, store: ResourceStore): Promise<void> {
    console.log("PredicateCardinalitiesHandler.processResource");

    if (this.auxiliaryStrategy.isAuxiliaryIdentifier({path: path})) {
      // TODO: handle ACLs
      return;
    } else {
      console.log("\n" + path);
      const representation = await store.getRepresentation({path: path}, {type: {[INTERNAL_QUADS]: 1}});
      const dataStore = await readableToQuads(representation.data);

      for (const predicate of dataStore.getPredicates(null, null, null)) {
        console.log(predicate);
      }
    }
  }
}
