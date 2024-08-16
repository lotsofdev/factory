import { TComponentsSettings } from '@lotsof/components';

import { TComponentsComponentJson } from '@lotsof/components';

export type TFactoryServerConfig = {
  hostname: string;
  port: number;
  entrypoint: string;
};

export type TFactoryMediaQuery = {
  name: string;
  min: number;
  max: number;
};

export type TFactoryComponentJson = TComponentsComponentJson & {
  path: string;
  engines: string[];
  mocks: Record<string, string>;
  files: string[];
  values: any;
  schema: any;
};

export type TFactorySpecs = {
  components: Record<string, TFactoryComponentJson>;
  config: TFactoryConfig;
};

export type TFactoryUTConfig = {
  assets: Record<string, string>;
};

export type TFactoryProjectServerConfig = {
  protocol: 'http' | 'https';
  hostname: string;
  port: number;
};

export type TFactoryProjectConfig = {
  rootDir: string;
  server: TFactoryProjectServerConfig;
  assets: Record<string, string>;
};

export type TFactoryConfig = {
  components: TComponentsSettings;
  server: TFactoryServerConfig;
  ui: TFactoryUTConfig;
  project: TFactoryProjectConfig;
};

import { JSONSchema7 } from 'json-schema';

import {
  TJsonSchemaFormUpdateObject,
  TJsonSchemaFormWidget,
} from '@lotsof/json-schema-form/src/shared/JsonSchemaForm.types.js';

export type TFactoryComponent = {
  id: string;
  name: string;
  description?: string;
  schema: JSONSchema7;
  values: any;
  $component: Element;
};

export type TFactoryUpdateObject = TJsonSchemaFormUpdateObject & {
  component: TFactoryComponent;
};

export type TFactoryUpdateResult = {
  component: TFactoryComponent;
  path: string[];
  value: any;
  html?: string;
};

export type TFactoryCustomEvent = CustomEvent & {
  detail: TFactoryComponent;
};

export type TFactoryAdapter = {
  applyUpdate(TFactoryUpdateObject): void;
};

export type TFactoryWidget = TJsonSchemaFormWidget & {};
