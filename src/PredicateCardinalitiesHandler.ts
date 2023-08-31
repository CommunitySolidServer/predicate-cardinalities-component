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
import {Quad} from "@rdfjs/types";
import {stringQuadToQuad} from "rdf-string";

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
    return (await this.keyValueStorage.has(this.PREFIX)) && (await this.keyValueStorage.get(this.PREFIX) as any)["initialized"] || false;
  }

  public async initialize(baseUrl: string, store: ResourceStore): Promise<void> {
    if (await this.isInitialized()) {
      return;
    }

    await this.processContainer(baseUrl, store);

    await this.keyValueStorage.set(this.PREFIX, {"initialized": true});
  }

  public async processContainer(path: string, store: ResourceStore): Promise<void> {
    const container = await store.getRepresentation({path: path}, {type: {[INTERNAL_QUADS]: 1}});
    for await (const child of container.metadata.quads(container.metadata.identifier, LDP.terms.contains, null, null)) {
      if (isContainerPath(child.object.value)) {
        await this.processContainer(child.object.value, store);
      } else {
        await this.processResource({path: child.object.value}, store);
      }
    }
    container.data.destroy();
  }

  public async processResource(identifier: ResourceIdentifier, store: ResourceStore): Promise<void> {
    const credentials = {};
    const root = await this.canProcessResource(identifier, credentials);
    if (!root) {
      return;
    }
    // Now we're sure the resource is publicly readable.

    const representation = await store.getRepresentation(identifier, {type: {[INTERNAL_QUADS]: 1}});
    const dataStore = await readableToQuads(representation.data);

    // Map from predicates to cardinalities, start with the already existing cardinalities.
    const key = this.PREFIX + root.path + "_public";
    const currentCount = await this.keyValueStorage.get(key) as any || {};
    const predicates = dataStore.getPredicates(null, null, null).map(predicate => predicate.value);
    const cardinalities = predicates.reduce((acc: any, cur) => {
      if (cur in acc) {
        acc[cur]++;
      } else {
        acc[cur] = 1;
      }
      return acc;
    }, currentCount);

    // Add cardinalities to the cache.
    await this.keyValueStorage.set(key, cardinalities);
  }

  public async canProcessResource(identifier: ResourceIdentifier, credentials: Credentials): Promise<ResourceIdentifier | undefined> {
    if (this.auxiliaryStrategy.isAuxiliaryIdentifier(identifier)) {
      return;
    }
    if (!await this.isReadable(identifier, credentials)) {
      return;
    }
    return this.getStorageRoot(identifier);
  }

  private async isReadable(identifier: ResourceIdentifier, credentials: Credentials): Promise<boolean> {
    const requestedModes = new IdentifierSetMultiMap([[identifier, AccessMode.read]]);
    try {
      const permissions = await this.reader.handleSafe({credentials, requestedModes});
      return permissions.get(identifier)?.read === true;
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

  public async isPredicateCardinalitiesUri(identifier: ResourceIdentifier): Promise<boolean> {
    return identifier.path === (await this.getStorageRoot(identifier))?.path + ".well-known/.predicate-cardinalities";
  }

  public async getPredicateCardinalities(path: string): Promise<Quad[]> {
    const key = this.PREFIX + path + "_public";
    const cardinalities = await this.keyValueStorage.get(key) as any || {};
    const quads = Object.entries(cardinalities).flatMap(([predicate, cardinality]) => {
      const blankNode = '_:b' + Math.random().toString(36).substring(7);
      return [stringQuadToQuad({
        subject: path,
        predicate: 'http://rdfs.org/ns/void#propertyPartition',
        object: blankNode,
      }),
        stringQuadToQuad({
          subject: blankNode,
          predicate: 'http://rdfs.org/ns/void#property',
          object: predicate,
        }),
        stringQuadToQuad({
          subject: blankNode,
          predicate: 'http://rdfs.org/ns/void#triples',
          object: `"${cardinality}"^^http://www.w3.org/2001/XMLSchema#integer`,
        })];
    });
    quads.push(stringQuadToQuad({
      subject: path,
      predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      object: 'http://rdfs.org/ns/void#Dataset',
    }));

    return quads;
  }

  public async updateCache(podBase: string, store: ResourceStore): Promise<void> {
    // Delete cardinalities for that pod.
    const key = this.PREFIX + podBase + "_public";
    await this.keyValueStorage.delete(key);

    // Re-add cardinalities for that pod.
    await this.processContainer(podBase, store);
  }

  public async isPermissionAuxiliary(identifier: ResourceIdentifier): Promise<ResourceIdentifier | undefined> {
    return identifier.path.endsWith('.acl') ? this.getStorageRoot(identifier) : undefined;
  }
}
