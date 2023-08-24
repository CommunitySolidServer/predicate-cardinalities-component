import {
  ActivityEmitter,
  AS,
  getLoggerFor,
  Initializer,
  RepresentationMetadata,
  ResourceIdentifier,
  ResourceStore,
  VocabularyTerm
} from "@solid/community-server";
import {PredicateCardinalitiesHandler} from "../PredicateCardinalitiesHandler";

export class PredicateCardinalitiesInitializer extends Initializer {
  protected readonly logger = getLoggerFor(this);

  private readonly handler: PredicateCardinalitiesHandler;
  private readonly baseUrl: string;
  private readonly store: ResourceStore;
  private readonly emitter: ActivityEmitter;

  public constructor(handler: PredicateCardinalitiesHandler, baseUrl: string, store: ResourceStore, emitter: ActivityEmitter) {
    super();
    this.handler = handler;
    this.baseUrl = baseUrl;
    this.store = store;
    this.emitter = emitter;

    emitter.on('changed', (topic, activity, metadata): void => {
      this.emit(topic, activity, metadata).catch((error): void => {
        this.logger.error(`Error while emitting activity to update predicate cardinalities: ${error}`);
      });
    });
  }

  public async handle(): Promise<void> {
    console.log("PredicateCardinalitiesInitializer.handle");
    await this.handler.initialize(this.baseUrl, this.store);
  }

  private async emit(topic: ResourceIdentifier, activity: VocabularyTerm<typeof AS>, metadata: RepresentationMetadata): Promise<void> {
    this.logger.info(`Emitting activity ${activity.value} to topic ${topic.path} with metadata ${metadata}`);
    // TODO: update the predicate cardinalities accordingly in the cache
  }
}
