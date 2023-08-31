import {
  BasicRepresentation,
  INTERNAL_QUADS,
  MethodNotAllowedHttpError,
  NotImplementedHttpError,
  OkResponseDescription,
  OperationHttpHandler,
  OperationHttpHandlerInput,
  ResponseDescription
} from "@solid/community-server";
import {PredicateCardinalitiesHandler} from "../PredicateCardinalitiesHandler";

export class PredicateCardinalitiesHttpHandler extends OperationHttpHandler {

  private readonly handler: PredicateCardinalitiesHandler;

  public constructor(handler: PredicateCardinalitiesHandler) {
    super();
    this.handler = handler;
  }

  public async canHandle({operation}: OperationHttpHandlerInput): Promise<void> {
    if (operation.method !== "GET") {
      throw new MethodNotAllowedHttpError([operation.method], `Only GET requests can target the storage description.`);
    }
    // Path should be the storage root appended with ".well-known/.predicate-cardinalities".
    if (!await this.handler.isPredicateCardinalitiesUri(operation.target)) {
      throw new NotImplementedHttpError(`No predicate cardinalities at ${operation.target.path}`);
    }
  }

  public async handle({operation}: OperationHttpHandlerInput): Promise<ResponseDescription> {
    const containerPath = operation.target.path?.slice(0, -".well-known/.predicate-cardinalities".length);

    const quads = await this.handler.getPredicateCardinalities(containerPath!);

    const representation = new BasicRepresentation(quads, INTERNAL_QUADS);

    return new OkResponseDescription(representation.metadata, representation.data);
  }

}

