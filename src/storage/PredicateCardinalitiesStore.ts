import {
  createErrorMessage,
  getLoggerFor,
  isContainerIdentifier,
  PassthroughStore,
  ResourceStore,
  StorageLocationStrategy
} from "@solid/community-server";
import {ResourceIdentifier} from "@solid/community-server/dist/http/representation/ResourceIdentifier";
import {RepresentationPreferences} from "@solid/community-server/dist/http/representation/RepresentationPreferences";
import {Conditions} from "@solid/community-server/dist/storage/Conditions";
import {Representation} from "@solid/community-server/dist/http/representation/Representation";

export class PredicateCardinalitiesStore extends PassthroughStore {
  protected readonly logger = getLoggerFor(this);

  private readonly storageStrategy: StorageLocationStrategy;

  public constructor(source: ResourceStore, storageStrategy: StorageLocationStrategy) {
    super(source);
    this.storageStrategy = storageStrategy;
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences, conditions?: Conditions): Promise<Representation> {
    const representation = await super.getRepresentation(identifier, preferences, conditions);
    if (isContainerIdentifier(identifier) && (await this.getStorageRoot(identifier))?.path === identifier.path) {
      const data = representation.data;

      // Add triple to the stream, specifying the location of the VoID predicate cardinalities.
      data.push(`<> <http://rdfs.org/ns/void#inDataset> <${identifier.path}.well-known/.predicate-cardinalities>.\n`)
    }
    return representation;
  }

  private async getStorageRoot(identifier: ResourceIdentifier): Promise<ResourceIdentifier | undefined> {
    try {
      return await this.storageStrategy.getStorageIdentifier(identifier);
    } catch (error: unknown) {
      this.logger.error(`Unable to find storage root: ${createErrorMessage(error)}`);
    }
  }
}
