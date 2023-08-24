import {
  AccessMode,
  AuxiliaryStrategy,
  createErrorMessage,
  Credentials,
  getLoggerFor,
  IdentifierSetMultiMap,
  INTERNAL_QUADS,
  isContainerPath,
  KeyValueStorage,
  LDP,
  PermissionReader,
  readableToQuads,
  ResourceIdentifier,
  ResourceStore,
  StorageLocationStrategy
} from "@solid/community-server";

export class PredicateCardinalitiesHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly keyValueStorage: KeyValueStorage<string, unknown>;
  private readonly auxiliaryStrategy: AuxiliaryStrategy;
  private readonly reader: PermissionReader;
  private readonly storageStrategy: StorageLocationStrategy;

  private readonly PREFIX = "predicate_cardinalities_";

  public constructor(keyValueStorage: KeyValueStorage<string, unknown>, auxiliaryStrategy: AuxiliaryStrategy, reader: PermissionReader, storageStrategy: StorageLocationStrategy) {
    this.keyValueStorage = keyValueStorage;
    this.auxiliaryStrategy = auxiliaryStrategy;
    this.reader = reader;
    this.storageStrategy = storageStrategy;
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

      const credentials = {};
      if (!await this.isReadable(path, credentials)) {
        return;
      }
      // Now we're sure the resource is publicly readable.

      const representation = await store.getRepresentation({path: path}, {type: {[INTERNAL_QUADS]: 1}});
      const dataStore = await readableToQuads(representation.data);

      // Map from predicates to cardinalities
      const predicates = dataStore.getPredicates(null, null, null).map(predicate => predicate.value);
      const cardinalities = predicates.reduce((acc: any, cur) => {
        const obj: any = acc.find((obj: any) => obj.predicate === cur);
        if (obj) {
          obj.count++;
        } else {
          acc.push({predicate: cur, count: 1});
        }
        return acc;
      }, []);
      console.log(cardinalities);

      const root = await this.getStorageRoot({path: path});
      if (!root) {
        return;
      }

      // Add cardinalities to the cache.
      for (const cardinality of cardinalities) {
        const key = this.PREFIX + root.path + '_' + cardinality.predicate;
        const currentCount = await this.keyValueStorage.get(key) as any || {public: 0};
        currentCount.public += cardinality.count;
        await this.keyValueStorage.set(key, currentCount);
      }
    }
  }

  private async isReadable(path: string, credentials: Credentials): Promise<boolean> {
    const requestedModes = new IdentifierSetMultiMap([[{path: path}, AccessMode.read]]);
    try {
      const permissions = await this.reader.handleSafe({credentials, requestedModes});
      return permissions.get({path: path})?.read === true;
    } catch (error: unknown) {
      return false;
    }
  }

  private getStorageRoot(identifier: ResourceIdentifier): Promise<ResourceIdentifier> | undefined {
    try {
      return this.storageStrategy.getStorageIdentifier(identifier);
    } catch (error: unknown) {
      this.logger.error(`Unable to find storage root: ${createErrorMessage(error)}`);
    }
  }
}
