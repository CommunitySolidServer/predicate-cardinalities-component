import {
  ActivityEmitter,
  AS,
  getLoggerFor,
  Initializer,
  RepresentationMetadata,
  ResourceIdentifier,
  ResourceStore, setSafeInterval,
  VocabularyTerm
} from "@solid/community-server";
import {PredicateCardinalitiesHandler} from "../PredicateCardinalitiesHandler";

export class PredicateCardinalitiesInitializer extends Initializer {
  protected readonly logger = getLoggerFor(this);

  private readonly handler: PredicateCardinalitiesHandler;
  private readonly baseUrl: string;
  private readonly store: ResourceStore;
  private readonly emitter: ActivityEmitter;

  private dirtyCaches = new Set<string>();

  public constructor(handler: PredicateCardinalitiesHandler, baseUrl: string, store: ResourceStore, emitter: ActivityEmitter, updateInterval: number) {
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

    const timer = setSafeInterval(this.logger, 'Failed to update predicate cardinalities', async (): Promise<void> => {
      if (this.dirtyCaches) {
        const dirtyCaches = this.dirtyCaches;
        this.dirtyCaches = new Set();
        for (const pod of dirtyCaches) {
          await this.handler.updateCache(pod, this.store);
        }
      }
    }, updateInterval);
    timer.unref();
  }

  public async handle(): Promise<void> {
    console.log("PredicateCardinalitiesInitializer.handle");
    await this.handler.initialize(this.baseUrl, this.store);
  }

  private async emit(topic: ResourceIdentifier, activity: VocabularyTerm<typeof AS>, metadata: RepresentationMetadata): Promise<void> {
    const credentials = {};
    const root = await this.handler.canProcessResource(topic, credentials) || await this.handler.isPermissionAuxiliary(topic);
    if (root) {
      this.dirtyCaches.add(root.path);
    }
  }
}
