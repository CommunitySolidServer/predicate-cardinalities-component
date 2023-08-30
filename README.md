# Predicate Cardinalities Component

This repository contains an external component that can be injected into the [Community Solid Server (CSS)](https://github.com/CommunitySolidServer/CommunitySolidServer/).
It allows to expose a view containing the predicate cardinalities in the pod.

## How it works

For each pod, the pod's root container contains a triple to indicate where the predicate cardinalities view is located.
This triple has the following form:

```
<> <http://rdfs.org/ns/void#inDataset> </.well-known/.predicate-cardinalities>.
```

The view is thus located in the `.well-known/.predicate-cardinalities` location.

On startup, the component will check if the predicate cardinalities cache already exists and if not, will calculate the cardinalities over the entire pod.
Currently, only public readable resources are taken into account.
That is such that the view can be exposed publicly without leaking private information.

When the cardinalities view is requested, it is dynamically generated from the cache.
This cache is updated periodically, and only if one or multiple resources (or its ACL files) have been modified since the last update.
To change the update interval, change the `updateInterval` variable in the configuration of the component.
The default is set to `600000` milliseconds, or 10 minutes.

## Vocabulary

The vocabulary used in the view is the [VoID Vocabulary](https://www.w3.org/TR/2011/NOTE-void-20110303/).

Structure of the view:

```turtle
@prefix void: <http://rdfs.org/ns/void#> .

<{podBase}> a void:Dataset ;
    void:propertyPartition [
        void:property <{predicate}> ;
        void:triples <{cardinality}>
    ] .
```

## Running the server

Clone this repository, then install the packages

```bash
npm i
```

Build the project

```bash
npm run build
```

To run the server with your current folder as storage, use:

```bash
npm run start
```
