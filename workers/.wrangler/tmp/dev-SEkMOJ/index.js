var __defProp = Object.defineProperty;
var __name = (target, value) =>
  __defProp(target, 'name', { value, configurable: true });

// .wrangler/tmp/bundle-ZO1t3y/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url =
    request instanceof URL
      ? request
      : new URL(
          (typeof request === 'string'
            ? new Request(request, init)
            : request
          ).url
        );
  if (url.port && url.port !== '443' && url.protocol === 'https:') {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, 'checkURL');
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  },
});

// .wrangler/tmp/bundle-ZO1t3y/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete('CF-Connecting-IP');
  return request;
}
__name(stripCfConnectingIPHeader, 'stripCfConnectingIPHeader');
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray),
    ]);
  },
});

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = (i === middleware.length && next) || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, 'dispatch');
  };
}, 'compose');

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(
  async (request, options = /* @__PURE__ */ Object.create(null)) => {
    const { all = false, dot = false } = options;
    const headers =
      request instanceof HonoRequest ? request.raw.headers : request.headers;
    const contentType = headers.get('Content-Type');
    if (
      contentType?.startsWith('multipart/form-data') ||
      contentType?.startsWith('application/x-www-form-urlencoded')
    ) {
      return parseFormData(request, { all, dot });
    }
    return {};
  },
  'parseBody'
);
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, 'parseFormData');
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith('[]');
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes('.');
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, 'convertFormDataToBodyData');
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith('[]')) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, 'handleParsingAllValues');
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  let nestedForm = form;
  const keys = key.split('.');
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (
        !nestedForm[key2] ||
        typeof nestedForm[key2] !== 'object' ||
        Array.isArray(nestedForm[key2]) ||
        nestedForm[key2] instanceof File
      ) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, 'handleParsingNestedValues');

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name(path => {
  const paths = path.split('/');
  if (paths[0] === '') {
    paths.shift();
  }
  return paths;
}, 'splitPath');
var splitRoutingPath = /* @__PURE__ */ __name(routePath => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, 'splitRoutingPath');
var extractGroupsFromPath = /* @__PURE__ */ __name(path => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match, index) => {
    const mark = `@${index}`;
    groups.push([mark, match]);
    return mark;
  });
  return { groups, path };
}, 'extractGroupsFromPath');
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, 'replaceGroupMarks');
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === '*') {
    return '*';
  }
  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match[2]) {
        patternCache[cacheKey] =
          next && next[0] !== ':' && next[0] !== '*'
            ? [cacheKey, match[1], new RegExp(`^${match[2]}(?=/${next})`)]
            : [label, match[1], new RegExp(`^${match[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, 'getPattern');
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, match => {
      try {
        return decoder(match);
      } catch {
        return match;
      }
    });
  }
}, 'tryDecode');
var tryDecodeURI = /* @__PURE__ */ __name(
  str => tryDecode(str, decodeURI),
  'tryDecodeURI'
);
var getPath = /* @__PURE__ */ __name(request => {
  const url = request.url;
  const start = url.indexOf('/', url.charCodeAt(9) === 58 ? 13 : 8);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf('?', i);
      const path = url.slice(start, queryIndex === -1 ? void 0 : queryIndex);
      return tryDecodeURI(
        path.includes('%25') ? path.replace(/%25/g, '%2525') : path
      );
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start, i);
}, 'getPath');
var getPathNoStrict = /* @__PURE__ */ __name(request => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === '/'
    ? result.slice(0, -1)
    : result;
}, 'getPathNoStrict');
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === '/' ? '' : '/'}${base}${sub === '/' ? '' : `${base?.at(-1) === '/' ? '' : '/'}${sub?.[0] === '/' ? sub.slice(1) : sub}`}`;
}, 'mergePath');
var checkOptionalParameter = /* @__PURE__ */ __name(path => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(':')) {
    return null;
  }
  const segments = path.split('/');
  const results = [];
  let basePath = '';
  segments.forEach(segment => {
    if (segment !== '' && !/\:/.test(segment)) {
      basePath += '/' + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === '') {
          results.push('/');
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace('?', '');
        basePath += '/' + optionalSegment;
        results.push(basePath);
      } else {
        basePath += '/' + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, 'checkOptionalParameter');
var _decodeURI = /* @__PURE__ */ __name(value => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf('+') !== -1) {
    value = value.replace(/\+/g, ' ');
  }
  return value.indexOf('%') !== -1
    ? tryDecode(value, decodeURIComponent_)
    : value;
}, '_decodeURI');
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf(`?${key}`, 8);
    if (keyIndex2 === -1) {
      keyIndex2 = url.indexOf(`&${key}`, 8);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf('&', valueIndex);
        return _decodeURI(
          url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex)
        );
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return '';
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf('?', 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf('&', keyIndex + 1);
    let valueIndex = url.indexOf('=', keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1
        ? nextKeyIndex === -1
          ? void 0
          : nextKeyIndex
        : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === '') {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = '';
    } else {
      value = url.slice(
        valueIndex + 1,
        nextKeyIndex === -1 ? void 0 : nextKeyIndex
      );
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, '_getQueryParam');
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, 'getQueryParams');
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name(
  str => tryDecode(str, decodeURIComponent_),
  'tryDecodeURIComponent'
);
var HonoRequest = /* @__PURE__ */ __name(
  class {
    raw;
    #validatedData;
    #matchResult;
    routeIndex = 0;
    path;
    bodyCache = {};
    constructor(request, path = '/', matchResult = [[]]) {
      this.raw = request;
      this.path = path;
      this.#matchResult = matchResult;
      this.#validatedData = {};
    }
    param(key) {
      return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
    }
    #getDecodedParam(key) {
      const paramKey = this.#matchResult[0][this.routeIndex][1][key];
      const param = this.#getParamValue(paramKey);
      return param
        ? /\%/.test(param)
          ? tryDecodeURIComponent(param)
          : param
        : void 0;
    }
    #getAllDecodedParams() {
      const decoded = {};
      const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
      for (const key of keys) {
        const value = this.#getParamValue(
          this.#matchResult[0][this.routeIndex][1][key]
        );
        if (value && typeof value === 'string') {
          decoded[key] = /\%/.test(value)
            ? tryDecodeURIComponent(value)
            : value;
        }
      }
      return decoded;
    }
    #getParamValue(paramKey) {
      return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
    }
    query(key) {
      return getQueryParam(this.url, key);
    }
    queries(key) {
      return getQueryParams(this.url, key);
    }
    header(name) {
      if (name) {
        return this.raw.headers.get(name) ?? void 0;
      }
      const headerData = {};
      this.raw.headers.forEach((value, key) => {
        headerData[key] = value;
      });
      return headerData;
    }
    async parseBody(options) {
      return (this.bodyCache.parsedBody ??= await parseBody(this, options));
    }
    #cachedBody = key => {
      const { bodyCache, raw: raw2 } = this;
      const cachedBody = bodyCache[key];
      if (cachedBody) {
        return cachedBody;
      }
      const anyCachedKey = Object.keys(bodyCache)[0];
      if (anyCachedKey) {
        return bodyCache[anyCachedKey].then(body => {
          if (anyCachedKey === 'json') {
            body = JSON.stringify(body);
          }
          return new Response(body)[key]();
        });
      }
      return (bodyCache[key] = raw2[key]());
    };
    json() {
      return this.#cachedBody('text').then(text => JSON.parse(text));
    }
    text() {
      return this.#cachedBody('text');
    }
    arrayBuffer() {
      return this.#cachedBody('arrayBuffer');
    }
    blob() {
      return this.#cachedBody('blob');
    }
    formData() {
      return this.#cachedBody('formData');
    }
    addValidatedData(target, data) {
      this.#validatedData[target] = data;
    }
    valid(target) {
      return this.#validatedData[target];
    }
    get url() {
      return this.raw.url;
    }
    get method() {
      return this.raw.method;
    }
    get [GET_MATCH_RESULT]() {
      return this.#matchResult;
    }
    get matchedRoutes() {
      return this.#matchResult[0].map(([[, route]]) => route);
    }
    get routePath() {
      return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex]
        .path;
    }
  },
  'HonoRequest'
);

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3,
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, 'raw');
var resolveCallback = /* @__PURE__ */ __name(
  async (str, phase, preserveCallbacks, context, buffer) => {
    if (typeof str === 'object' && !(str instanceof String)) {
      if (!(str instanceof Promise)) {
        str = str.toString();
      }
      if (str instanceof Promise) {
        str = await str;
      }
    }
    const callbacks = str.callbacks;
    if (!callbacks?.length) {
      return Promise.resolve(str);
    }
    if (buffer) {
      buffer[0] += str;
    } else {
      buffer = [str];
    }
    const resStr = Promise.all(
      callbacks.map(c => c({ phase, buffer, context }))
    ).then(res =>
      Promise.all(
        res
          .filter(Boolean)
          .map(str2 => resolveCallback(str2, phase, false, context, buffer))
      ).then(() => buffer[0])
    );
    if (preserveCallbacks) {
      return raw(await resStr, callbacks);
    } else {
      return resStr;
    }
  },
  'resolveCallback'
);

// node_modules/hono/dist/context.js
var TEXT_PLAIN = 'text/plain; charset=UTF-8';
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    'Content-Type': contentType,
    ...headers,
  };
}, 'setDefaultContentType');
var Context = /* @__PURE__ */ __name(
  class {
    #rawRequest;
    #req;
    env = {};
    #var;
    finalized = false;
    error;
    #status;
    #executionCtx;
    #res;
    #layout;
    #renderer;
    #notFoundHandler;
    #preparedHeaders;
    #matchResult;
    #path;
    constructor(req, options) {
      this.#rawRequest = req;
      if (options) {
        this.#executionCtx = options.executionCtx;
        this.env = options.env;
        this.#notFoundHandler = options.notFoundHandler;
        this.#path = options.path;
        this.#matchResult = options.matchResult;
      }
    }
    get req() {
      this.#req ??= new HonoRequest(
        this.#rawRequest,
        this.#path,
        this.#matchResult
      );
      return this.#req;
    }
    get event() {
      if (this.#executionCtx && 'respondWith' in this.#executionCtx) {
        return this.#executionCtx;
      } else {
        throw Error('This context has no FetchEvent');
      }
    }
    get executionCtx() {
      if (this.#executionCtx) {
        return this.#executionCtx;
      } else {
        throw Error('This context has no ExecutionContext');
      }
    }
    get res() {
      return (this.#res ||= new Response(null, {
        headers: (this.#preparedHeaders ??= new Headers()),
      }));
    }
    set res(_res) {
      if (this.#res && _res) {
        _res = new Response(_res.body, _res);
        for (const [k, v] of this.#res.headers.entries()) {
          if (k === 'content-type') {
            continue;
          }
          if (k === 'set-cookie') {
            const cookies = this.#res.headers.getSetCookie();
            _res.headers.delete('set-cookie');
            for (const cookie of cookies) {
              _res.headers.append('set-cookie', cookie);
            }
          } else {
            _res.headers.set(k, v);
          }
        }
      }
      this.#res = _res;
      this.finalized = true;
    }
    render = (...args) => {
      this.#renderer ??= content => this.html(content);
      return this.#renderer(...args);
    };
    setLayout = layout => (this.#layout = layout);
    getLayout = () => this.#layout;
    setRenderer = renderer => {
      this.#renderer = renderer;
    };
    header = (name, value, options) => {
      if (this.finalized) {
        this.#res = new Response(this.#res.body, this.#res);
      }
      const headers = this.#res
        ? this.#res.headers
        : (this.#preparedHeaders ??= new Headers());
      if (value === void 0) {
        headers.delete(name);
      } else if (options?.append) {
        headers.append(name, value);
      } else {
        headers.set(name, value);
      }
    };
    status = status => {
      this.#status = status;
    };
    set = (key, value) => {
      this.#var ??= /* @__PURE__ */ new Map();
      this.#var.set(key, value);
    };
    get = key => {
      return this.#var ? this.#var.get(key) : void 0;
    };
    get var() {
      if (!this.#var) {
        return {};
      }
      return Object.fromEntries(this.#var);
    }
    #newResponse(data, arg, headers) {
      const responseHeaders = this.#res
        ? new Headers(this.#res.headers)
        : (this.#preparedHeaders ?? new Headers());
      if (typeof arg === 'object' && 'headers' in arg) {
        const argHeaders =
          arg.headers instanceof Headers
            ? arg.headers
            : new Headers(arg.headers);
        for (const [key, value] of argHeaders) {
          if (key.toLowerCase() === 'set-cookie') {
            responseHeaders.append(key, value);
          } else {
            responseHeaders.set(key, value);
          }
        }
      }
      if (headers) {
        for (const [k, v] of Object.entries(headers)) {
          if (typeof v === 'string') {
            responseHeaders.set(k, v);
          } else {
            responseHeaders.delete(k);
            for (const v2 of v) {
              responseHeaders.append(k, v2);
            }
          }
        }
      }
      const status =
        typeof arg === 'number' ? arg : (arg?.status ?? this.#status);
      return new Response(data, { status, headers: responseHeaders });
    }
    newResponse = (...args) => this.#newResponse(...args);
    body = (data, arg, headers) => this.#newResponse(data, arg, headers);
    text = (text, arg, headers) => {
      return !this.#preparedHeaders &&
        !this.#status &&
        !arg &&
        !headers &&
        !this.finalized
        ? new Response(text)
        : this.#newResponse(
            text,
            arg,
            setDefaultContentType(TEXT_PLAIN, headers)
          );
    };
    json = (object, arg, headers) => {
      return this.#newResponse(
        JSON.stringify(object),
        arg,
        setDefaultContentType('application/json', headers)
      );
    };
    html = (html, arg, headers) => {
      const res = /* @__PURE__ */ __name(
        html2 =>
          this.#newResponse(
            html2,
            arg,
            setDefaultContentType('text/html; charset=UTF-8', headers)
          ),
        'res'
      );
      return typeof html === 'object'
        ? resolveCallback(
            html,
            HtmlEscapedCallbackPhase.Stringify,
            false,
            {}
          ).then(res)
        : res(html);
    };
    redirect = (location, status) => {
      const locationString = String(location);
      this.header(
        'Location',
        !/[^\x00-\xFF]/.test(locationString)
          ? locationString
          : encodeURI(locationString)
      );
      return this.newResponse(null, status ?? 302);
    };
    notFound = () => {
      this.#notFoundHandler ??= () => new Response();
      return this.#notFoundHandler(this);
    };
  },
  'Context'
);

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = 'ALL';
var METHOD_NAME_ALL_LOWERCASE = 'all';
var METHODS = ['get', 'post', 'put', 'delete', 'options', 'patch'];
var MESSAGE_MATCHER_IS_ALREADY_BUILT =
  'Can not add a route since the matcher is already built.';
var UnsupportedPathError = /* @__PURE__ */ __name(
  class extends Error {},
  'UnsupportedPathError'
);

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = '__COMPOSED_HANDLER';

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name(c => {
  return c.text('404 Not Found', 404);
}, 'notFoundHandler');
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ('getResponse' in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text('Internal Server Error', 500);
}, 'errorHandler');
var Hono = /* @__PURE__ */ __name(
  class {
    get;
    post;
    put;
    delete;
    options;
    patch;
    all;
    on;
    use;
    router;
    getPath;
    _basePath = '/';
    #path = '/';
    routes = [];
    constructor(options = {}) {
      const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
      allMethods.forEach(method => {
        this[method] = (args1, ...args) => {
          if (typeof args1 === 'string') {
            this.#path = args1;
          } else {
            this.#addRoute(method, this.#path, args1);
          }
          args.forEach(handler => {
            this.#addRoute(method, this.#path, handler);
          });
          return this;
        };
      });
      this.on = (method, path, ...handlers) => {
        for (const p of [path].flat()) {
          this.#path = p;
          for (const m of [method].flat()) {
            handlers.map(handler => {
              this.#addRoute(m.toUpperCase(), this.#path, handler);
            });
          }
        }
        return this;
      };
      this.use = (arg1, ...handlers) => {
        if (typeof arg1 === 'string') {
          this.#path = arg1;
        } else {
          this.#path = '*';
          handlers.unshift(arg1);
        }
        handlers.forEach(handler => {
          this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
        });
        return this;
      };
      const { strict, ...optionsWithoutStrict } = options;
      Object.assign(this, optionsWithoutStrict);
      this.getPath =
        (strict ?? true) ? (options.getPath ?? getPath) : getPathNoStrict;
    }
    #clone() {
      const clone = new Hono({
        router: this.router,
        getPath: this.getPath,
      });
      clone.errorHandler = this.errorHandler;
      clone.#notFoundHandler = this.#notFoundHandler;
      clone.routes = this.routes;
      return clone;
    }
    #notFoundHandler = notFoundHandler;
    errorHandler = errorHandler;
    route(path, app2) {
      const subApp = this.basePath(path);
      app2.routes.map(r => {
        let handler;
        if (app2.errorHandler === errorHandler) {
          handler = r.handler;
        } else {
          handler = /* @__PURE__ */ __name(
            async (c, next) =>
              (
                await compose([], app2.errorHandler)(c, () =>
                  r.handler(c, next)
                )
              ).res,
            'handler'
          );
          handler[COMPOSED_HANDLER] = r.handler;
        }
        subApp.#addRoute(r.method, r.path, handler);
      });
      return this;
    }
    basePath(path) {
      const subApp = this.#clone();
      subApp._basePath = mergePath(this._basePath, path);
      return subApp;
    }
    onError = handler => {
      this.errorHandler = handler;
      return this;
    };
    notFound = handler => {
      this.#notFoundHandler = handler;
      return this;
    };
    mount(path, applicationHandler, options) {
      let replaceRequest;
      let optionHandler;
      if (options) {
        if (typeof options === 'function') {
          optionHandler = options;
        } else {
          optionHandler = options.optionHandler;
          if (options.replaceRequest === false) {
            replaceRequest = /* @__PURE__ */ __name(
              request => request,
              'replaceRequest'
            );
          } else {
            replaceRequest = options.replaceRequest;
          }
        }
      }
      const getOptions = optionHandler
        ? c => {
            const options2 = optionHandler(c);
            return Array.isArray(options2) ? options2 : [options2];
          }
        : c => {
            let executionContext = void 0;
            try {
              executionContext = c.executionCtx;
            } catch {}
            return [c.env, executionContext];
          };
      replaceRequest ||= (() => {
        const mergedPath = mergePath(this._basePath, path);
        const pathPrefixLength = mergedPath === '/' ? 0 : mergedPath.length;
        return request => {
          const url = new URL(request.url);
          url.pathname = url.pathname.slice(pathPrefixLength) || '/';
          return new Request(url, request);
        };
      })();
      const handler = /* @__PURE__ */ __name(async (c, next) => {
        const res = await applicationHandler(
          replaceRequest(c.req.raw),
          ...getOptions(c)
        );
        if (res) {
          return res;
        }
        await next();
      }, 'handler');
      this.#addRoute(METHOD_NAME_ALL, mergePath(path, '*'), handler);
      return this;
    }
    #addRoute(method, path, handler) {
      method = method.toUpperCase();
      path = mergePath(this._basePath, path);
      const r = { basePath: this._basePath, path, method, handler };
      this.router.add(method, path, [handler, r]);
      this.routes.push(r);
    }
    #handleError(err, c) {
      if (err instanceof Error) {
        return this.errorHandler(err, c);
      }
      throw err;
    }
    #dispatch(request, executionCtx, env, method) {
      if (method === 'HEAD') {
        return (async () =>
          new Response(
            null,
            await this.#dispatch(request, executionCtx, env, 'GET')
          ))();
      }
      const path = this.getPath(request, { env });
      const matchResult = this.router.match(method, path);
      const c = new Context(request, {
        path,
        matchResult,
        env,
        executionCtx,
        notFoundHandler: this.#notFoundHandler,
      });
      if (matchResult[0].length === 1) {
        let res;
        try {
          res = matchResult[0][0][0][0](c, async () => {
            c.res = await this.#notFoundHandler(c);
          });
        } catch (err) {
          return this.#handleError(err, c);
        }
        return res instanceof Promise
          ? res
              .then(
                resolved =>
                  resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
              )
              .catch(err => this.#handleError(err, c))
          : (res ?? this.#notFoundHandler(c));
      }
      const composed = compose(
        matchResult[0],
        this.errorHandler,
        this.#notFoundHandler
      );
      return (async () => {
        try {
          const context = await composed(c);
          if (!context.finalized) {
            throw new Error(
              'Context is not finalized. Did you forget to return a Response object or `await next()`?'
            );
          }
          return context.res;
        } catch (err) {
          return this.#handleError(err, c);
        }
      })();
    }
    fetch = (request, ...rest) => {
      return this.#dispatch(request, rest[1], rest[0], request.method);
    };
    request = (input, requestInit, Env2, executionCtx) => {
      if (input instanceof Request) {
        return this.fetch(
          requestInit ? new Request(input, requestInit) : input,
          Env2,
          executionCtx
        );
      }
      input = input.toString();
      return this.fetch(
        new Request(
          /^https?:\/\//.test(input)
            ? input
            : `http://localhost${mergePath('/', input)}`,
          requestInit
        ),
        Env2,
        executionCtx
      );
    };
    fire = () => {
      addEventListener('fetch', event => {
        event.respondWith(
          this.#dispatch(event.request, event, void 0, event.request.method)
        );
      });
    };
  },
  'Hono'
);

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = '[^/]+';
var ONLY_WILDCARD_REG_EXP_STR = '.*';
var TAIL_WILDCARD_REG_EXP_STR = '(?:|/.*)';
var PATH_ERROR = Symbol();
var regExpMetaChars = new Set('.\\+*[^]$()');
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? (a < b ? -1 : 1) : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (
    b === ONLY_WILDCARD_REG_EXP_STR ||
    b === TAIL_WILDCARD_REG_EXP_STR
  ) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? (a < b ? -1 : 1) : b.length - a.length;
}
__name(compareKey, 'compareKey');
var Node = /* @__PURE__ */ __name(
  class {
    #index;
    #varIndex;
    #children = /* @__PURE__ */ Object.create(null);
    insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
      if (tokens.length === 0) {
        if (this.#index !== void 0) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        this.#index = index;
        return;
      }
      const [token, ...restTokens] = tokens;
      const pattern =
        token === '*'
          ? restTokens.length === 0
            ? ['', '', ONLY_WILDCARD_REG_EXP_STR]
            : ['', '', LABEL_REG_EXP_STR]
          : token === '/*'
            ? ['', '', TAIL_WILDCARD_REG_EXP_STR]
            : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let node;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
        if (name && pattern[2]) {
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, '(?:');
          if (/\((?!\?:)/.test(regexpStr)) {
            throw PATH_ERROR;
          }
        }
        node = this.#children[regexpStr];
        if (!node) {
          if (
            Object.keys(this.#children).some(
              k =>
                k !== ONLY_WILDCARD_REG_EXP_STR &&
                k !== TAIL_WILDCARD_REG_EXP_STR
            )
          ) {
            throw PATH_ERROR;
          }
          if (pathErrorCheckOnly) {
            return;
          }
          node = this.#children[regexpStr] = new Node();
          if (name !== '') {
            node.#varIndex = context.varIndex++;
          }
        }
        if (!pathErrorCheckOnly && name !== '') {
          paramMap.push([name, node.#varIndex]);
        }
      } else {
        node = this.#children[token];
        if (!node) {
          if (
            Object.keys(this.#children).some(
              k =>
                k.length > 1 &&
                k !== ONLY_WILDCARD_REG_EXP_STR &&
                k !== TAIL_WILDCARD_REG_EXP_STR
            )
          ) {
            throw PATH_ERROR;
          }
          if (pathErrorCheckOnly) {
            return;
          }
          node = this.#children[token] = new Node();
        }
      }
      node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
    }
    buildRegExpStr() {
      const childKeys = Object.keys(this.#children).sort(compareKey);
      const strList = childKeys.map(k => {
        const c = this.#children[k];
        return (
          (typeof c.#varIndex === 'number'
            ? `(${k})@${c.#varIndex}`
            : regExpMetaChars.has(k)
              ? `\\${k}`
              : k) + c.buildRegExpStr()
        );
      });
      if (typeof this.#index === 'number') {
        strList.unshift(`#${this.#index}`);
      }
      if (strList.length === 0) {
        return '';
      }
      if (strList.length === 1) {
        return strList[0];
      }
      return '(?:' + strList.join('|') + ')';
    }
  },
  'Node'
);

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = /* @__PURE__ */ __name(
  class {
    #context = { varIndex: 0 };
    #root = new Node();
    insert(path, index, pathErrorCheckOnly) {
      const paramAssoc = [];
      const groups = [];
      for (let i = 0; ; ) {
        let replaced = false;
        path = path.replace(/\{[^}]+\}/g, m => {
          const mark = `@\\${i}`;
          groups[i] = [mark, m];
          i++;
          replaced = true;
          return mark;
        });
        if (!replaced) {
          break;
        }
      }
      const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
      for (let i = groups.length - 1; i >= 0; i--) {
        const [mark] = groups[i];
        for (let j = tokens.length - 1; j >= 0; j--) {
          if (tokens[j].indexOf(mark) !== -1) {
            tokens[j] = tokens[j].replace(mark, groups[i][1]);
            break;
          }
        }
      }
      this.#root.insert(
        tokens,
        index,
        paramAssoc,
        this.#context,
        pathErrorCheckOnly
      );
      return paramAssoc;
    }
    buildRegExp() {
      let regexp = this.#root.buildRegExpStr();
      if (regexp === '') {
        return [/^$/, [], []];
      }
      let captureIndex = 0;
      const indexReplacementMap = [];
      const paramReplacementMap = [];
      regexp = regexp.replace(
        /#(\d+)|@(\d+)|\.\*\$/g,
        (_, handlerIndex, paramIndex) => {
          if (handlerIndex !== void 0) {
            indexReplacementMap[++captureIndex] = Number(handlerIndex);
            return '$()';
          }
          if (paramIndex !== void 0) {
            paramReplacementMap[Number(paramIndex)] = ++captureIndex;
            return '';
          }
          return '';
        }
      );
      return [
        new RegExp(`^${regexp}`),
        indexReplacementMap,
        paramReplacementMap,
      ];
    }
  },
  'Trie'
);

// node_modules/hono/dist/router/reg-exp-router/router.js
var emptyParam = [];
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return (wildcardRegExpCache[path] ??= new RegExp(
    path === '*'
      ? ''
      : `^${path.replace(/\/\*$|([.\\+*[^\]$()])/g, (_, metaChar) =>
          metaChar ? `\\${metaChar}` : '(?:|/.*)'
        )}$`
  ));
}
__name(buildWildcardRegExp, 'buildWildcardRegExp');
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, 'clearWildcardRegExpCache');
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes
    .map(route => [!/\*|\/:/.test(route[0]), ...route])
    .sort(([isStaticA, pathA], [isStaticB, pathB]) =>
      isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
    );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [
        handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]),
        emptyParam,
      ];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(
  buildMatcherFromPreprocessedRoutes,
  'buildMatcherFromPreprocessedRoutes'
);
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, 'findMiddleware');
var RegExpRouter = /* @__PURE__ */ __name(
  class {
    name = 'RegExpRouter';
    #middleware;
    #routes;
    constructor() {
      this.#middleware = {
        [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null),
      };
      this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    }
    add(method, path, handler) {
      const middleware = this.#middleware;
      const routes = this.#routes;
      if (!middleware || !routes) {
        throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
      }
      if (!middleware[method]) {
        [middleware, routes].forEach(handlerMap => {
          handlerMap[method] = /* @__PURE__ */ Object.create(null);
          Object.keys(handlerMap[METHOD_NAME_ALL]).forEach(p => {
            handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
          });
        });
      }
      if (path === '/*') {
        path = '*';
      }
      const paramCount = (path.match(/\/:/g) || []).length;
      if (/\*$/.test(path)) {
        const re = buildWildcardRegExp(path);
        if (method === METHOD_NAME_ALL) {
          Object.keys(middleware).forEach(m => {
            middleware[m][path] ||=
              findMiddleware(middleware[m], path) ||
              findMiddleware(middleware[METHOD_NAME_ALL], path) ||
              [];
          });
        } else {
          middleware[method][path] ||=
            findMiddleware(middleware[method], path) ||
            findMiddleware(middleware[METHOD_NAME_ALL], path) ||
            [];
        }
        Object.keys(middleware).forEach(m => {
          if (method === METHOD_NAME_ALL || method === m) {
            Object.keys(middleware[m]).forEach(p => {
              re.test(p) && middleware[m][p].push([handler, paramCount]);
            });
          }
        });
        Object.keys(routes).forEach(m => {
          if (method === METHOD_NAME_ALL || method === m) {
            Object.keys(routes[m]).forEach(
              p => re.test(p) && routes[m][p].push([handler, paramCount])
            );
          }
        });
        return;
      }
      const paths = checkOptionalParameter(path) || [path];
      for (let i = 0, len = paths.length; i < len; i++) {
        const path2 = paths[i];
        Object.keys(routes).forEach(m => {
          if (method === METHOD_NAME_ALL || method === m) {
            routes[m][path2] ||= [
              ...(findMiddleware(middleware[m], path2) ||
                findMiddleware(middleware[METHOD_NAME_ALL], path2) ||
                []),
            ];
            routes[m][path2].push([handler, paramCount - len + i + 1]);
          }
        });
      }
    }
    match(method, path) {
      clearWildcardRegExpCache();
      const matchers = this.#buildAllMatchers();
      this.match = (method2, path2) => {
        const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
        const staticMatch = matcher[2][path2];
        if (staticMatch) {
          return staticMatch;
        }
        const match = path2.match(matcher[0]);
        if (!match) {
          return [[], emptyParam];
        }
        const index = match.indexOf('', 1);
        return [matcher[1][index], match];
      };
      return this.match(method, path);
    }
    #buildAllMatchers() {
      const matchers = /* @__PURE__ */ Object.create(null);
      Object.keys(this.#routes)
        .concat(Object.keys(this.#middleware))
        .forEach(method => {
          matchers[method] ||= this.#buildMatcher(method);
        });
      this.#middleware = this.#routes = void 0;
      return matchers;
    }
    #buildMatcher(method) {
      const routes = [];
      let hasOwnRoute = method === METHOD_NAME_ALL;
      [this.#middleware, this.#routes].forEach(r => {
        const ownRoute = r[method]
          ? Object.keys(r[method]).map(path => [path, r[method][path]])
          : [];
        if (ownRoute.length !== 0) {
          hasOwnRoute ||= true;
          routes.push(...ownRoute);
        } else if (method !== METHOD_NAME_ALL) {
          routes.push(
            ...Object.keys(r[METHOD_NAME_ALL]).map(path => [
              path,
              r[METHOD_NAME_ALL][path],
            ])
          );
        }
      });
      if (!hasOwnRoute) {
        return null;
      } else {
        return buildMatcherFromPreprocessedRoutes(routes);
      }
    }
  },
  'RegExpRouter'
);

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = /* @__PURE__ */ __name(
  class {
    name = 'SmartRouter';
    #routers = [];
    #routes = [];
    constructor(init) {
      this.#routers = init.routers;
    }
    add(method, path, handler) {
      if (!this.#routes) {
        throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
      }
      this.#routes.push([method, path, handler]);
    }
    match(method, path) {
      if (!this.#routes) {
        throw new Error('Fatal error');
      }
      const routers = this.#routers;
      const routes = this.#routes;
      const len = routers.length;
      let i = 0;
      let res;
      for (; i < len; i++) {
        const router2 = routers[i];
        try {
          for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
            router2.add(...routes[i2]);
          }
          res = router2.match(method, path);
        } catch (e) {
          if (e instanceof UnsupportedPathError) {
            continue;
          }
          throw e;
        }
        this.match = router2.match.bind(router2);
        this.#routers = [router2];
        this.#routes = void 0;
        break;
      }
      if (i === len) {
        throw new Error('Fatal error');
      }
      this.name = `SmartRouter + ${this.activeRouter.name}`;
      return res;
    }
    get activeRouter() {
      if (this.#routes || this.#routers.length !== 1) {
        throw new Error('No active router has been determined yet.');
      }
      return this.#routers[0];
    }
  },
  'SmartRouter'
);

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = /* @__PURE__ */ __name(
  class {
    #methods;
    #children;
    #patterns;
    #order = 0;
    #params = emptyParams;
    constructor(method, handler, children) {
      this.#children = children || /* @__PURE__ */ Object.create(null);
      this.#methods = [];
      if (method && handler) {
        const m = /* @__PURE__ */ Object.create(null);
        m[method] = { handler, possibleKeys: [], score: 0 };
        this.#methods = [m];
      }
      this.#patterns = [];
    }
    insert(method, path, handler) {
      this.#order = ++this.#order;
      let curNode = this;
      const parts = splitRoutingPath(path);
      const possibleKeys = [];
      for (let i = 0, len = parts.length; i < len; i++) {
        const p = parts[i];
        const nextP = parts[i + 1];
        const pattern = getPattern(p, nextP);
        const key = Array.isArray(pattern) ? pattern[0] : p;
        if (key in curNode.#children) {
          curNode = curNode.#children[key];
          if (pattern) {
            possibleKeys.push(pattern[1]);
          }
          continue;
        }
        curNode.#children[key] = new Node2();
        if (pattern) {
          curNode.#patterns.push(pattern);
          possibleKeys.push(pattern[1]);
        }
        curNode = curNode.#children[key];
      }
      curNode.#methods.push({
        [method]: {
          handler,
          possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
          score: this.#order,
        },
      });
      return curNode;
    }
    #getHandlerSets(node, method, nodeParams, params) {
      const handlerSets = [];
      for (let i = 0, len = node.#methods.length; i < len; i++) {
        const m = node.#methods[i];
        const handlerSet = m[method] || m[METHOD_NAME_ALL];
        const processedSet = {};
        if (handlerSet !== void 0) {
          handlerSet.params = /* @__PURE__ */ Object.create(null);
          handlerSets.push(handlerSet);
          if (
            nodeParams !== emptyParams ||
            (params && params !== emptyParams)
          ) {
            for (
              let i2 = 0, len2 = handlerSet.possibleKeys.length;
              i2 < len2;
              i2++
            ) {
              const key = handlerSet.possibleKeys[i2];
              const processed = processedSet[handlerSet.score];
              handlerSet.params[key] =
                params?.[key] && !processed
                  ? params[key]
                  : (nodeParams[key] ?? params?.[key]);
              processedSet[handlerSet.score] = true;
            }
          }
        }
      }
      return handlerSets;
    }
    search(method, path) {
      const handlerSets = [];
      this.#params = emptyParams;
      const curNode = this;
      let curNodes = [curNode];
      const parts = splitPath(path);
      const curNodesQueue = [];
      for (let i = 0, len = parts.length; i < len; i++) {
        const part = parts[i];
        const isLast = i === len - 1;
        const tempNodes = [];
        for (let j = 0, len2 = curNodes.length; j < len2; j++) {
          const node = curNodes[j];
          const nextNode = node.#children[part];
          if (nextNode) {
            nextNode.#params = node.#params;
            if (isLast) {
              if (nextNode.#children['*']) {
                handlerSets.push(
                  ...this.#getHandlerSets(
                    nextNode.#children['*'],
                    method,
                    node.#params
                  )
                );
              }
              handlerSets.push(
                ...this.#getHandlerSets(nextNode, method, node.#params)
              );
            } else {
              tempNodes.push(nextNode);
            }
          }
          for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
            const pattern = node.#patterns[k];
            const params =
              node.#params === emptyParams ? {} : { ...node.#params };
            if (pattern === '*') {
              const astNode = node.#children['*'];
              if (astNode) {
                handlerSets.push(
                  ...this.#getHandlerSets(astNode, method, node.#params)
                );
                astNode.#params = params;
                tempNodes.push(astNode);
              }
              continue;
            }
            if (!part) {
              continue;
            }
            const [key, name, matcher] = pattern;
            const child = node.#children[key];
            const restPathString = parts.slice(i).join('/');
            if (matcher instanceof RegExp) {
              const m = matcher.exec(restPathString);
              if (m) {
                params[name] = m[0];
                handlerSets.push(
                  ...this.#getHandlerSets(child, method, node.#params, params)
                );
                if (Object.keys(child.#children).length) {
                  child.#params = params;
                  const componentCount = m[0].match(/\//)?.length ?? 0;
                  const targetCurNodes = (curNodesQueue[componentCount] ||= []);
                  targetCurNodes.push(child);
                }
                continue;
              }
            }
            if (matcher === true || matcher.test(part)) {
              params[name] = part;
              if (isLast) {
                handlerSets.push(
                  ...this.#getHandlerSets(child, method, params, node.#params)
                );
                if (child.#children['*']) {
                  handlerSets.push(
                    ...this.#getHandlerSets(
                      child.#children['*'],
                      method,
                      params,
                      node.#params
                    )
                  );
                }
              } else {
                child.#params = params;
                tempNodes.push(child);
              }
            }
          }
        }
        curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
      }
      if (handlerSets.length > 1) {
        handlerSets.sort((a, b) => {
          return a.score - b.score;
        });
      }
      return [handlerSets.map(({ handler, params }) => [handler, params])];
    }
  },
  'Node'
);

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = /* @__PURE__ */ __name(
  class {
    name = 'TrieRouter';
    #node;
    constructor() {
      this.#node = new Node2();
    }
    add(method, path, handler) {
      const results = checkOptionalParameter(path);
      if (results) {
        for (let i = 0, len = results.length; i < len; i++) {
          this.#node.insert(method, results[i], handler);
        }
        return;
      }
      this.#node.insert(method, path, handler);
    }
    match(method, path) {
      return this.#node.search(method, path);
    }
  },
  'TrieRouter'
);

// node_modules/hono/dist/hono.js
var Hono2 = /* @__PURE__ */ __name(
  class extends Hono {
    constructor(options = {}) {
      super(options);
      this.router =
        options.router ??
        new SmartRouter({
          routers: [new RegExpRouter(), new TrieRouter()],
        });
    }
  },
  'Hono'
);

// node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name(options => {
  const defaults = {
    origin: '*',
    allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
    allowHeaders: [],
    exposeHeaders: [],
  };
  const opts = {
    ...defaults,
    ...options,
  };
  const findAllowOrigin = (optsOrigin => {
    if (typeof optsOrigin === 'string') {
      if (optsOrigin === '*') {
        return () => optsOrigin;
      } else {
        return origin => (optsOrigin === origin ? origin : null);
      }
    } else if (typeof optsOrigin === 'function') {
      return optsOrigin;
    } else {
      return origin => (optsOrigin.includes(origin) ? origin : null);
    }
  })(opts.origin);
  const findAllowMethods = (optsAllowMethods => {
    if (typeof optsAllowMethods === 'function') {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, 'set');
    const allowOrigin = findAllowOrigin(c.req.header('origin') || '', c);
    if (allowOrigin) {
      set('Access-Control-Allow-Origin', allowOrigin);
    }
    if (opts.origin !== '*') {
      const existingVary = c.req.header('Vary');
      if (existingVary) {
        set('Vary', existingVary);
      } else {
        set('Vary', 'Origin');
      }
    }
    if (opts.credentials) {
      set('Access-Control-Allow-Credentials', 'true');
    }
    if (opts.exposeHeaders?.length) {
      set('Access-Control-Expose-Headers', opts.exposeHeaders.join(','));
    }
    if (c.req.method === 'OPTIONS') {
      if (opts.maxAge != null) {
        set('Access-Control-Max-Age', opts.maxAge.toString());
      }
      const allowMethods = findAllowMethods(c.req.header('origin') || '', c);
      if (allowMethods.length) {
        set('Access-Control-Allow-Methods', allowMethods.join(','));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header('Access-Control-Request-Headers');
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set('Access-Control-Allow-Headers', headers.join(','));
        c.res.headers.append('Vary', 'Access-Control-Request-Headers');
      }
      c.res.headers.delete('Content-Length');
      c.res.headers.delete('Content-Type');
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: 'No Content',
      });
    }
    await next();
  }, 'cors2');
}, 'cors');

// node_modules/hono/dist/utils/color.js
function getColorEnabled() {
  const { process, Deno } = globalThis;
  const isNoColor =
    typeof Deno?.noColor === 'boolean'
      ? Deno.noColor
      : process !== void 0
        ? 'NO_COLOR' in process?.env
        : false;
  return !isNoColor;
}
__name(getColorEnabled, 'getColorEnabled');
async function getColorEnabledAsync() {
  const { navigator } = globalThis;
  const cfWorkers = 'cloudflare:workers';
  const isNoColor =
    navigator !== void 0 && navigator.userAgent === 'Cloudflare-Workers'
      ? await (async () => {
          try {
            return 'NO_COLOR' in ((await import(cfWorkers)).env ?? {});
          } catch {
            return false;
          }
        })()
      : !getColorEnabled();
  return !isNoColor;
}
__name(getColorEnabledAsync, 'getColorEnabledAsync');

// node_modules/hono/dist/middleware/logger/index.js
var humanize = /* @__PURE__ */ __name(times => {
  const [delimiter, separator] = [',', '.'];
  const orderTimes = times.map(v =>
    v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + delimiter)
  );
  return orderTimes.join(separator);
}, 'humanize');
var time = /* @__PURE__ */ __name(start => {
  const delta = Date.now() - start;
  return humanize([delta < 1e3 ? delta + 'ms' : Math.round(delta / 1e3) + 's']);
}, 'time');
var colorStatus = /* @__PURE__ */ __name(async status => {
  const colorEnabled = await getColorEnabledAsync();
  if (colorEnabled) {
    switch ((status / 100) | 0) {
      case 5:
        return `\x1B[31m${status}\x1B[0m`;
      case 4:
        return `\x1B[33m${status}\x1B[0m`;
      case 3:
        return `\x1B[36m${status}\x1B[0m`;
      case 2:
        return `\x1B[32m${status}\x1B[0m`;
    }
  }
  return `${status}`;
}, 'colorStatus');
async function log(fn, prefix, method, path, status = 0, elapsed) {
  const out =
    prefix === '<--'
      ? `${prefix} ${method} ${path}`
      : `${prefix} ${method} ${path} ${await colorStatus(status)} ${elapsed}`;
  fn(out);
}
__name(log, 'log');
var logger = /* @__PURE__ */ __name((fn = console.log) => {
  return /* @__PURE__ */ __name(async function logger2(c, next) {
    const { method, url } = c.req;
    const path = url.slice(url.indexOf('/', 8));
    await log(fn, '<--', method, path);
    const start = Date.now();
    await next();
    await log(fn, '-->', method, path, c.res.status, time(start));
  }, 'logger2');
}, 'logger');

// src/utils/mock-database.ts
var MockDatabase = class {
  jobs = /* @__PURE__ */ new Map();
  platforms = [
    {
      id: 1,
      name: 'YouTube',
      domain: 'youtube.com',
      supported_formats: JSON.stringify(['mp3', 'mp4']),
      max_duration: 7200,
      icon: '\u{1F3A5}',
      quality_options: JSON.stringify({
        mp3: ['128', '192', '320'],
        mp4: ['360', '720', '1080'],
      }),
      created_at: /* @__PURE__ */ new Date().toISOString(),
      updated_at: /* @__PURE__ */ new Date().toISOString(),
    },
    {
      id: 2,
      name: 'TikTok',
      domain: 'tiktok.com',
      supported_formats: JSON.stringify(['mp3', 'mp4']),
      max_duration: 600,
      icon: '\u{1F3B5}',
      quality_options: JSON.stringify({
        mp3: ['128', '192'],
        mp4: ['360', '720'],
      }),
      created_at: /* @__PURE__ */ new Date().toISOString(),
      updated_at: /* @__PURE__ */ new Date().toISOString(),
    },
  ];
  async prepare(query) {
    return {
      bind: (...params) => ({
        all: async () => {
          if (query.includes('SELECT * FROM platforms')) {
            return { results: this.platforms };
          }
          if (query.includes('SELECT * FROM conversion_jobs WHERE id = ?')) {
            const jobId = params[0];
            const job = this.jobs.get(jobId);
            return { results: job ? [job] : [] };
          }
          return { results: [] };
        },
        first: async () => {
          if (query.includes('SELECT * FROM conversion_jobs WHERE id = ?')) {
            const jobId = params[0];
            return this.jobs.get(jobId) || null;
          }
          return null;
        },
        run: async () => {
          if (query.includes('INSERT INTO conversion_jobs')) {
            const jobId = params[0];
            const job = {
              id: jobId,
              url: params[1],
              platform: params[2],
              format: params[3],
              quality: params[4],
              status: 'queued',
              progress: 0,
              download_url: null,
              file_path: null,
              metadata: null,
              error_message: null,
              created_at: /* @__PURE__ */ new Date().toISOString(),
              updated_at: /* @__PURE__ */ new Date().toISOString(),
              expires_at: new Date(
                Date.now() + 24 * 60 * 60 * 1e3
              ).toISOString(),
            };
            this.jobs.set(jobId, job);
            return { success: true };
          }
          if (query.includes('UPDATE conversion_jobs')) {
            const jobId = params[params.length - 1];
            const job = this.jobs.get(jobId);
            if (job) {
              if (query.includes('status = ?')) {
                job.status = params[0];
                job.updated_at = /* @__PURE__ */ new Date().toISOString();
              }
              if (query.includes('progress = ?')) {
                job.progress = params[0];
                job.updated_at = /* @__PURE__ */ new Date().toISOString();
              }
              this.jobs.set(jobId, job);
            }
            return { success: true };
          }
          return { success: true };
        },
      }),
    };
  }
  // Direct methods for easier access
  async getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }
  async createJob(jobId, url, platform, format, quality) {
    const job = {
      id: jobId,
      url,
      platform,
      format,
      quality,
      status: 'queued',
      progress: 0,
      download_url: null,
      file_path: null,
      metadata: null,
      error_message: null,
      created_at: /* @__PURE__ */ new Date().toISOString(),
      updated_at: /* @__PURE__ */ new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString(),
    };
    this.jobs.set(jobId, job);
    return job;
  }
  async updateJob(jobId, updates) {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, updates, {
        updated_at: /* @__PURE__ */ new Date().toISOString(),
      });
      this.jobs.set(jobId, job);
    }
    return job;
  }
  async getPlatforms() {
    return this.platforms;
  }
};
__name(MockDatabase, 'MockDatabase');
var globalMockDb = null;
function getGlobalMockDatabase() {
  if (!globalMockDb) {
    globalMockDb = new MockDatabase();
  }
  return globalMockDb;
}
__name(getGlobalMockDatabase, 'getGlobalMockDatabase');

// src/utils/database.ts
var DatabaseManager = class {
  constructor(env) {
    this.env = env;
  }
  // Conversion Jobs
  async createConversionJob(job) {
    const now = Math.floor(Date.now() / 1e3);
    const expiresAt = now + 24 * 60 * 60;
    if (!this.env.DB) {
      console.warn('Using mock database for development environment');
      const mockDb = getGlobalMockDatabase();
      const mockJob = await mockDb.createJob(
        job.id,
        job.url,
        job.platform,
        job.format,
        job.quality
      );
      return {
        ...mockJob,
        format: job.format,
        created_at: now,
        updated_at: now,
        expires_at: expiresAt,
      };
    }
    const stmt = this.env.DB.prepare(`
      INSERT INTO conversion_jobs (
        id, url, platform, format, quality, status, progress,
        file_path, download_url, metadata, error_message,
        created_at, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await stmt
      .bind(
        job.id,
        job.url,
        job.platform,
        job.format,
        job.quality,
        job.status,
        job.progress,
        job.file_path || null,
        job.download_url || null,
        job.metadata || null,
        job.error_message || null,
        now,
        now,
        expiresAt
      )
      .run();
    return {
      ...job,
      created_at: now,
      updated_at: now,
      expires_at: expiresAt,
    };
  }
  async getConversionJob(id) {
    if (!this.env.DB) {
      console.warn('Using mock database for development environment');
      const mockDb = getGlobalMockDatabase();
      return await mockDb.getJob(id);
    }
    const stmt = this.env.DB.prepare(
      'SELECT * FROM conversion_jobs WHERE id = ?'
    );
    const result = await stmt.bind(id).first();
    return result || null;
  }
  async updateConversionJob(id, updates) {
    if (!this.env.DB) {
      console.warn('Using mock database for development environment');
      const mockDb = getGlobalMockDatabase();
      await mockDb.updateJob(id, updates);
      return;
    }
    const now = Math.floor(Date.now() / 1e3);
    const fields = Object.keys(updates).filter(
      key => key !== 'id' && key !== 'created_at'
    );
    const values = fields.map(field => updates[field]);
    if (fields.length === 0) return;
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const stmt = this.env.DB.prepare(`
      UPDATE conversion_jobs
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `);
    await stmt.bind(...values, now, id).run();
  }
  async deleteExpiredJobs(timestamp) {
    const now = timestamp
      ? Math.floor(timestamp / 1e3)
      : Math.floor(Date.now() / 1e3);
    const stmt = this.env.DB.prepare(
      'DELETE FROM conversion_jobs WHERE expires_at < ?'
    );
    const result = await stmt.bind(now).run();
    return result.meta.changes || 0;
  }
  async getActiveConversionJobs() {
    const stmt = this.env.DB.prepare(`
      SELECT * FROM conversion_jobs
      WHERE status IN ('queued', 'processing')
      ORDER BY created_at ASC
    `);
    const result = await stmt.all();
    return result.results || [];
  }
  async getJobsByStatus(status) {
    const stmt = this.env.DB.prepare(
      'SELECT * FROM conversion_jobs WHERE status = ? ORDER BY created_at DESC'
    );
    const result = await stmt.bind(status).all();
    return result.results || [];
  }
  // Platforms
  async getAllPlatforms() {
    if (!this.env.DB) {
      console.warn('Using mock database for development environment');
      const mockDb = getGlobalMockDatabase();
      return await mockDb.getPlatforms();
    }
    const stmt = this.env.DB.prepare(
      'SELECT * FROM platforms WHERE is_active = 1 ORDER BY name'
    );
    const result = await stmt.all();
    return result.results || [];
  }
  async getPlatformByDomain(domain) {
    const stmt = this.env.DB.prepare(
      'SELECT * FROM platforms WHERE domain = ? AND is_active = 1'
    );
    const result = await stmt.bind(domain).first();
    return result || null;
  }
  async updatePlatform(id, updates) {
    const now = Math.floor(Date.now() / 1e3);
    const fields = Object.keys(updates).filter(
      key => key !== 'id' && key !== 'created_at'
    );
    const values = fields.map(field => updates[field]);
    if (fields.length === 0) return;
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const stmt = this.env.DB.prepare(`
      UPDATE platforms 
      SET ${setClause}, updated_at = ? 
      WHERE id = ?
    `);
    await stmt.bind(...values, now, id).run();
  }
  // Usage Stats
  async recordUsageStats(stats) {
    const now = Math.floor(Date.now() / 1e3);
    const stmt = this.env.DB.prepare(`
      INSERT OR REPLACE INTO usage_stats (
        date, platform, format, total_conversions, 
        successful_conversions, total_duration, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await stmt
      .bind(
        stats.date,
        stats.platform,
        stats.format,
        stats.total_conversions,
        stats.successful_conversions,
        stats.total_duration,
        now,
        now
      )
      .run();
  }
  async getUsageStats(startDate, endDate) {
    const stmt = this.env.DB.prepare(`
      SELECT * FROM usage_stats 
      WHERE date >= ? AND date <= ? 
      ORDER BY date DESC, platform, format
    `);
    const result = await stmt.bind(startDate, endDate).all();
    return result.results || [];
  }
  // Utility methods
  async healthCheck() {
    try {
      const stmt = this.env.DB.prepare('SELECT 1 as test');
      await stmt.first();
      return {
        status: 'healthy',
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(`Database health check failed: ${error}`);
    }
  }
  async getStats() {
    const [totalJobs, activeJobs, totalPlatforms, activePlatforms] =
      await Promise.all([
        this.env.DB.prepare(
          'SELECT COUNT(*) as count FROM conversion_jobs'
        ).first(),
        this.env.DB.prepare(
          'SELECT COUNT(*) as count FROM conversion_jobs WHERE status IN (?, ?)'
        )
          .bind('queued', 'processing')
          .first(),
        this.env.DB.prepare('SELECT COUNT(*) as count FROM platforms').first(),
        this.env.DB.prepare(
          'SELECT COUNT(*) as count FROM platforms WHERE is_active = 1'
        ).first(),
      ]);
    return {
      totalJobs: totalJobs?.count || 0,
      activeJobs: activeJobs?.count || 0,
      totalPlatforms: totalPlatforms?.count || 0,
      activePlatforms: activePlatforms?.count || 0,
    };
  }
};
__name(DatabaseManager, 'DatabaseManager');

// src/utils/cache.ts
var CacheManager = class {
  constructor(env) {
    this.env = env;
  }
  // Video Metadata Caching
  async cacheVideoMetadata(videoId, metadata, ttl = 3600) {
    const key = `metadata:${videoId}`;
    await this.env.CACHE.put(key, JSON.stringify(metadata), {
      expirationTtl: ttl,
    });
  }
  async getVideoMetadata(videoId) {
    const key = `metadata:${videoId}`;
    const cached = await this.env.CACHE.get(key);
    if (!cached) return null;
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.error('Failed to parse cached metadata:', error);
      return null;
    }
  }
  // Conversion Status Caching
  async cacheConversionStatus(jobId, status, progress, ttl = 1800) {
    const key = `status:${jobId}`;
    const data = { status, progress, timestamp: Date.now() };
    await this.env.CACHE.put(key, JSON.stringify(data), { expirationTtl: ttl });
  }
  async getConversionStatus(jobId) {
    const key = `status:${jobId}`;
    const cached = await this.env.CACHE.get(key);
    if (!cached) return null;
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.error('Failed to parse cached status:', error);
      return null;
    }
  }
  // Platform Information Caching
  async cachePlatforms(platforms, ttl = 86400) {
    const key = 'platforms';
    await this.env.CACHE.put(key, JSON.stringify(platforms), {
      expirationTtl: ttl,
    });
  }
  async getPlatforms() {
    const key = 'platforms';
    const cached = await this.env.CACHE.get(key);
    if (!cached) return null;
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.error('Failed to parse cached platforms:', error);
      return null;
    }
  }
  // Rate Limiting
  async checkRateLimit(ip, limit = 10, window = 60) {
    const key = `rate:${ip}`;
    const now = Math.floor(Date.now() / 1e3);
    const windowStart = now - window;
    const cached = await this.env.CACHE.get(key);
    let requests = [];
    if (cached) {
      try {
        const data = JSON.parse(cached);
        requests = data.requests || [];
      } catch (error) {
        console.error('Failed to parse rate limit data:', error);
      }
    }
    requests = requests.filter(timestamp => timestamp > windowStart);
    const allowed = requests.length < limit;
    const remaining = Math.max(0, limit - requests.length);
    const resetTime = requests.length > 0 ? requests[0] + window : now + window;
    if (allowed) {
      requests.push(now);
      await this.env.CACHE.put(key, JSON.stringify({ requests }), {
        expirationTtl: window,
      });
    }
    return { allowed, remaining, resetTime };
  }
  // URL Validation Cache
  async cacheUrlValidation(url, isValid, platform, ttl = 1800) {
    const key = `url:${btoa(url)}`;
    const data = { isValid, platform, timestamp: Date.now() };
    await this.env.CACHE.put(key, JSON.stringify(data), { expirationTtl: ttl });
  }
  async getUrlValidation(url) {
    const key = `url:${btoa(url)}`;
    const cached = await this.env.CACHE.get(key);
    if (!cached) return null;
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.error('Failed to parse cached URL validation:', error);
      return null;
    }
  }
  // Generic Cache Operations
  async set(key, value, ttl) {
    const options = ttl ? { expirationTtl: ttl } : void 0;
    await this.env.CACHE.put(key, JSON.stringify(value), options);
  }
  async get(key) {
    const cached = await this.env.CACHE.get(key);
    if (!cached) return null;
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.error(`Failed to parse cached value for key ${key}:`, error);
      return null;
    }
  }
  async delete(key) {
    await this.env.CACHE.delete(key);
  }
  async list(prefix) {
    const options = prefix ? { prefix } : void 0;
    const list = await this.env.CACHE.list(options);
    return list.keys.map(key => key.name);
  }
  // Cache Statistics
  async getCacheStats() {
    const [
      metadataKeys,
      statusKeys,
      rateLimitKeys,
      urlValidationKeys,
      allKeys,
    ] = await Promise.all([
      this.env.CACHE.list({ prefix: 'metadata:' }),
      this.env.CACHE.list({ prefix: 'status:' }),
      this.env.CACHE.list({ prefix: 'rate:' }),
      this.env.CACHE.list({ prefix: 'url:' }),
      this.env.CACHE.list(),
    ]);
    return {
      metadataKeys: metadataKeys.keys.length,
      statusKeys: statusKeys.keys.length,
      rateLimitKeys: rateLimitKeys.keys.length,
      urlValidationKeys: urlValidationKeys.keys.length,
      totalKeys: allKeys.keys.length,
    };
  }
  // Cleanup expired entries (manual cleanup for debugging)
  async cleanup() {
    const allKeys = await this.env.CACHE.list();
    let deleted = 0;
    for (const key of allKeys.keys) {
      try {
        const value = await this.env.CACHE.get(key.name);
        if (!value) {
          deleted++;
        }
      } catch (error) {
        await this.env.CACHE.delete(key.name);
        deleted++;
      }
    }
    return { deleted };
  }
};
__name(CacheManager, 'CacheManager');

// src/utils/url-validator.ts
var PLATFORM_PATTERNS = [
  {
    name: 'YouTube',
    domain: 'youtube.com',
    patterns: [
      /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)/i,
      /^https?:\/\/(www\.)?youtube\.com\/shorts\//i,
    ],
    extractVideoId: url => {
      const patterns = [
        /[?&]v=([^&]+)/,
        /youtu\.be\/([^?]+)/,
        /embed\/([^?]+)/,
        /v\/([^?]+)/,
        /shorts\/([^?]+)/,
      ];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      return null;
    },
    supportedFormats: ['mp3', 'mp4'],
    maxDuration: 7200,
    // 2 hours
    qualityOptions: {
      mp3: ['128', '192', '320'],
      mp4: ['360', '720', '1080'],
    },
  },
  {
    name: 'TikTok',
    domain: 'tiktok.com',
    patterns: [
      /^https?:\/\/(www\.)?(tiktok\.com\/@[^/]+\/video\/|vm\.tiktok\.com\/)/i,
    ],
    extractVideoId: url => {
      const patterns = [/\/video\/(\d+)/, /vm\.tiktok\.com\/([^/]+)/];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      return null;
    },
    supportedFormats: ['mp3', 'mp4'],
    maxDuration: 600,
    // 10 minutes
    qualityOptions: {
      mp3: ['128', '192'],
      mp4: ['360', '720'],
    },
  },
  {
    name: 'X (Twitter)',
    domain: 'x.com',
    patterns: [
      /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[^/]+\/status\/\d+/i,
    ],
    extractVideoId: url => {
      const match = url.match(/status\/(\d+)/);
      return match ? match[1] : null;
    },
    supportedFormats: ['mp3', 'mp4'],
    maxDuration: 1200,
    // 20 minutes
    qualityOptions: {
      mp3: ['128', '192'],
      mp4: ['360', '720'],
    },
  },
  {
    name: 'Facebook',
    domain: 'facebook.com',
    patterns: [
      /^https?:\/\/(www\.)?(facebook\.com|fb\.watch)\/.*\/videos?\//i,
      /^https?:\/\/(www\.)?fb\.watch\/[^/]+/i,
    ],
    extractVideoId: url => {
      const patterns = [/videos?\/(\d+)/, /fb\.watch\/([^/?]+)/];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      return null;
    },
    supportedFormats: ['mp3', 'mp4'],
    maxDuration: 3600,
    // 1 hour
    qualityOptions: {
      mp3: ['128', '192'],
      mp4: ['360', '720'],
    },
  },
  {
    name: 'Instagram',
    domain: 'instagram.com',
    patterns: [/^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[^/]+/i],
    extractVideoId: url => {
      const match = url.match(/\/(p|reel|tv)\/([^/?]+)/);
      return match ? match[2] : null;
    },
    supportedFormats: ['mp3', 'mp4'],
    maxDuration: 900,
    // 15 minutes
    qualityOptions: {
      mp3: ['128', '192'],
      mp4: ['360', '720'],
    },
  },
];
var UrlValidator = class {
  /**
   * Validate a URL and detect its platform
   */
  static validateUrl(url) {
    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        error: {
          type: 'INVALID_URL' /* INVALID_URL */,
          message: 'URL is required and must be a string',
          retryable: false,
        },
      };
    }
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      return {
        isValid: false,
        error: {
          type: 'INVALID_URL' /* INVALID_URL */,
          message: 'URL cannot be empty',
          retryable: false,
        },
      };
    }
    let parsedUrl;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      return {
        isValid: false,
        error: {
          type: 'INVALID_URL' /* INVALID_URL */,
          message: 'Invalid URL format',
          retryable: false,
        },
      };
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        isValid: false,
        error: {
          type: 'INVALID_URL' /* INVALID_URL */,
          message: 'URL must use HTTP or HTTPS protocol',
          retryable: false,
        },
      };
    }
    const platformPattern = this.detectPlatform(trimmedUrl);
    if (!platformPattern) {
      return {
        isValid: false,
        error: {
          type: 'UNSUPPORTED_PLATFORM' /* UNSUPPORTED_PLATFORM */,
          message:
            'This platform is not supported. Please use a supported video platform.',
          retryable: false,
        },
      };
    }
    const videoId = platformPattern.extractVideoId(trimmedUrl);
    if (!videoId) {
      return {
        isValid: false,
        error: {
          type: 'INVALID_URL' /* INVALID_URL */,
          message: 'Could not extract video ID from URL',
          retryable: false,
        },
      };
    }
    const platform = {
      name: platformPattern.name,
      domain: platformPattern.domain,
      supportedFormats: platformPattern.supportedFormats,
      maxDuration: platformPattern.maxDuration,
      icon: this.getPlatformIcon(platformPattern.name),
      qualityOptions: platformPattern.qualityOptions,
    };
    return {
      isValid: true,
      platform,
      videoId,
      normalizedUrl: trimmedUrl,
    };
  }
  /**
   * Detect platform from URL
   */
  static detectPlatform(url) {
    for (const platform of PLATFORM_PATTERNS) {
      for (const pattern of platform.patterns) {
        if (pattern.test(url)) {
          return platform;
        }
      }
    }
    return null;
  }
  /**
   * Get platform icon (placeholder for now)
   */
  static getPlatformIcon(platformName) {
    const icons = {
      YouTube: '\u{1F3A5}',
      TikTok: '\u{1F3B5}',
      'X (Twitter)': '\u{1F426}',
      Facebook: '\u{1F4D8}',
      Instagram: '\u{1F4F7}',
    };
    return icons[platformName] || '\u{1F3AC}';
  }
  /**
   * Convert PlatformConfig from database to Platform interface
   */
  static convertPlatformConfig(config) {
    let supportedFormats = [];
    let qualityOptions = {};
    try {
      supportedFormats = JSON.parse(config.supported_formats);
    } catch {
      supportedFormats = ['mp3', 'mp4'];
    }
    try {
      if (config.config) {
        const parsedConfig = JSON.parse(config.config);
        qualityOptions = parsedConfig.quality_options || {};
      }
    } catch {
      qualityOptions = {
        mp3: ['128', '192', '320'],
        mp4: ['360', '720', '1080'],
      };
    }
    return {
      name: config.name,
      domain: config.domain,
      supportedFormats,
      maxDuration: config.max_duration,
      icon: this.getPlatformIcon(config.name),
      qualityOptions,
    };
  }
  /**
   * Validate format and quality options
   */
  static validateFormatAndQuality(platform, format, quality) {
    if (!platform.supportedFormats.includes(format)) {
      return {
        isValid: false,
        error: {
          type: 'INVALID_URL' /* INVALID_URL */,
          message: `Format ${format} is not supported for ${platform.name}`,
          retryable: false,
        },
      };
    }
    const qualityOptions = platform.qualityOptions[format];
    if (qualityOptions && !qualityOptions.includes(quality)) {
      return {
        isValid: false,
        error: {
          type: 'INVALID_URL' /* INVALID_URL */,
          message: `Quality ${quality} is not supported for ${format} on ${platform.name}`,
          retryable: false,
        },
      };
    }
    return { isValid: true };
  }
};
__name(UrlValidator, 'UrlValidator');

// src/utils/job-manager.ts
var JobManager = class {
  db;
  env;
  constructor(env) {
    this.env = env;
    this.db = new DatabaseManager(env);
  }
  /**
   * Create a new conversion job
   */
  async createJob(url, platform, format, quality) {
    const jobId = this.generateJobId();
    const job = {
      id: jobId,
      url,
      platform,
      format,
      quality,
      status: 'queued',
      progress: 0,
    };
    await this.db.createConversionJob(job);
    return jobId;
  }
  /**
   * Get job status
   */
  async getJob(jobId) {
    return await this.db.getConversionJob(jobId);
  }
  /**
   * Update job status and progress
   */
  async updateJob(jobId, updates) {
    const updateData = {
      ...updates,
      updated_at: Date.now(),
    };
    await this.db.updateConversionJob(jobId, updateData);
  }
  /**
   * Mark job as completed with download URL
   */
  async completeJob(jobId, downloadUrl, filePath, metadata) {
    await this.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      download_url: downloadUrl,
      file_path: filePath,
      metadata: metadata ? JSON.stringify(metadata) : void 0,
    });
  }
  /**
   * Mark job as failed with error message
   */
  async failJob(jobId, errorMessage) {
    await this.updateJob(jobId, {
      status: 'failed',
      error_message: errorMessage,
    });
  }
  /**
   * Start processing a job
   */
  async startProcessing(jobId) {
    await this.updateJob(jobId, {
      status: 'processing',
      progress: 10,
    });
  }
  /**
   * Update job progress
   */
  async updateProgress(jobId, progress) {
    await this.updateJob(jobId, {
      progress: Math.min(100, Math.max(0, progress)),
    });
  }
  /**
   * Get all active jobs (for cleanup/monitoring)
   */
  async getActiveJobs() {
    return await this.db.getActiveConversionJobs();
  }
  /**
   * Clean up expired jobs
   */
  async cleanupExpiredJobs() {
    const now = Date.now();
    return await this.db.deleteExpiredJobs(now);
  }
  /**
   * Generate a unique job ID
   */
  generateJobId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `job_${timestamp}_${random}`;
  }
  /**
   * Estimate processing time based on format and platform
   */
  estimateProcessingTime(platform, format, duration) {
    let baseTime = format === 'mp3' ? 30 : 60;
    const platformMultiplier = {
      youtube: 1.2,
      tiktok: 0.8,
      twitter: 1,
      facebook: 1.3,
      instagram: 1.1,
    };
    const multiplier = platformMultiplier[platform.toLowerCase()] || 1;
    baseTime *= multiplier;
    if (duration) {
      baseTime += duration / 10;
    }
    return Math.ceil(baseTime);
  }
};
__name(JobManager, 'JobManager');

// src/utils/storage.ts
var StorageManager = class {
  env;
  constructor(env) {
    this.env = env;
  }
  /**
   * Upload a file to R2 storage
   */
  async uploadFile(fileName, filePath, contentType) {
    try {
      const key = `conversions/${fileName}`;
      if (!this.env.STORAGE) {
        console.warn('R2 storage not available in development environment');
        return `https://storage.getgoodtape.com/${key}`;
      }
      console.log(
        `Simulated upload: ${fileName} from ${filePath} (${contentType})`
      );
      const downloadUrl = await this.generateDownloadUrl(fileName);
      return downloadUrl;
    } catch (error) {
      console.error('Storage upload error:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upload file: ${errorMessage}`);
    }
  }
  /**
   * Upload file content directly to R2
   */
  async uploadFileContent(fileName, content, contentType, metadata) {
    try {
      if (!this.env.STORAGE) {
        throw new Error('R2 storage not available');
      }
      const key = `conversions/${fileName}`;
      const object = await this.env.STORAGE.put(key, content, {
        httpMetadata: {
          contentType: this.getContentType(contentType),
          cacheControl: 'public, max-age=31536000',
          // 1 year
        },
        customMetadata: {
          uploadedAt: Date.now().toString(),
          ...metadata,
        },
      });
      if (!object) {
        throw new Error('Failed to upload file to R2');
      }
      const contentSize =
        content instanceof ArrayBuffer
          ? content.byteLength
          : content instanceof Uint8Array
            ? content.length
            : content.length;
      console.log(
        `Successfully uploaded ${fileName} to R2 (${contentSize} bytes)`
      );
      return await this.generateDownloadUrl(fileName);
    } catch (error) {
      console.error('Storage upload content error:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upload file content: ${errorMessage}`);
    }
  }
  /**
   * Get a file from R2 storage
   */
  async getFile(fileName) {
    try {
      if (!this.env.STORAGE) {
        console.warn('R2 storage not available in development environment');
        return null;
      }
      const key = `conversions/${fileName}`;
      const object = await this.env.STORAGE.get(key);
      if (!object) {
        return null;
      }
      return new Response(object.body, {
        headers: {
          'Content-Type':
            object.httpMetadata?.contentType || 'application/octet-stream',
          'Content-Length': object.size.toString(),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }
  /**
   * Delete a file from R2 storage
   */
  async deleteFile(fileName) {
    try {
      if (!this.env.STORAGE) {
        console.warn('R2 storage not available in development environment');
        return false;
      }
      const key = `conversions/${fileName}`;
      await this.env.STORAGE.delete(key);
      return true;
    } catch (error) {
      console.error('Storage delete error:', error);
      return false;
    }
  }
  /**
   * Generate a signed download URL
   */
  async generateDownloadUrl(fileName, expiresIn = 3600) {
    const key = `conversions/${fileName}`;
    console.log(
      `Generated download URL for ${fileName}, expires in ${expiresIn}s`
    );
    return `https://storage.getgoodtape.com/${key}`;
  }
  /**
   * Get content type based on file format
   */
  getContentType(format) {
    const contentTypes = {
      mp3: 'audio/mpeg',
      mp4: 'video/mp4',
      wav: 'audio/wav',
      webm: 'video/webm',
    };
    return contentTypes[format.toLowerCase()] || 'application/octet-stream';
  }
  /**
   * List files in storage (for cleanup/monitoring)
   */
  async listFiles(prefix = 'conversions/') {
    try {
      if (!this.env.STORAGE) {
        console.warn('R2 storage not available in development environment');
        return [];
      }
      const objects = await this.env.STORAGE.list({ prefix });
      return objects.objects.map(obj => obj.key);
    } catch (error) {
      console.error('Storage list error:', error);
      return [];
    }
  }
  /**
   * Get file metadata
   */
  async getFileMetadata(fileName) {
    try {
      if (!this.env.STORAGE) {
        console.warn('R2 storage not available in development environment');
        return null;
      }
      const key = `conversions/${fileName}`;
      const object = await this.env.STORAGE.head(key);
      if (!object) {
        return null;
      }
      return {
        size: object.size,
        lastModified: object.uploaded,
        contentType: object.httpMetadata?.contentType,
        etag: object.etag,
      };
    } catch (error) {
      console.error('Storage metadata error:', error);
      return null;
    }
  }
  /**
   * Clean up old files
   */
  async cleanupOldFiles(maxAge = 24 * 60 * 60 * 1e3) {
    try {
      if (!this.env.STORAGE) {
        console.warn('R2 storage not available in development environment');
        return 0;
      }
      const objects = await this.env.STORAGE.list({ prefix: 'conversions/' });
      const now = Date.now();
      let deletedCount = 0;
      for (const object of objects.objects) {
        const uploadTime = new Date(object.uploaded).getTime();
        if (now - uploadTime > maxAge) {
          await this.env.STORAGE.delete(object.key);
          deletedCount++;
        }
      }
      return deletedCount;
    } catch (error) {
      console.error('Storage cleanup error:', error);
      return 0;
    }
  }
};
__name(StorageManager, 'StorageManager');

// src/utils/conversion-service.ts
var ConversionService = class {
  env;
  jobManager;
  storage;
  constructor(env) {
    this.env = env;
    this.jobManager = new JobManager(env);
    this.storage = new StorageManager(env);
  }
  /**
   * Start a new conversion job
   */
  async startConversion(request) {
    const jobId = await this.jobManager.createJob(
      request.url,
      request.platform || 'unknown',
      request.format,
      request.quality
    );
    this.processConversion(jobId, request).catch(error => {
      console.error(`Conversion failed for job ${jobId}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.jobManager.failJob(jobId, errorMessage);
    });
    return jobId;
  }
  /**
   * Get conversion status
   */
  async getConversionStatus(jobId) {
    const job = await this.jobManager.getJob(jobId);
    if (!job) {
      return null;
    }
    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      downloadUrl: job.download_url,
      metadata: job.metadata ? JSON.parse(job.metadata) : void 0,
      error: job.error_message,
      createdAt: new Date(job.created_at).toISOString(),
      updatedAt: new Date(job.updated_at).toISOString(),
      expiresAt: new Date(job.expires_at).toISOString(),
    };
  }
  /**
   * Process conversion (called asynchronously)
   */
  async processConversion(jobId, request) {
    try {
      await this.jobManager.startProcessing(jobId);
      const processingServiceUrl =
        this.env.PROCESSING_SERVICE_URL || 'http://localhost:8000';
      await this.jobManager.updateProgress(jobId, 20);
      const metadataResponse = await this.callProcessingService(
        `${processingServiceUrl}/extract-metadata`,
        { url: request.url }
      );
      if (!metadataResponse.success) {
        throw new Error(
          `Metadata extraction failed: ${metadataResponse.error}`
        );
      }
      const metadataObj = metadataResponse.metadata;
      const metadata = {
        title: metadataObj.title,
        duration: metadataObj.duration,
        thumbnail: metadataObj.thumbnail,
        uploader: metadataObj.uploader,
        uploadDate: metadataObj.upload_date,
        viewCount: metadataObj.view_count,
        description: metadataObj.description,
        tags: metadataObj.tags,
      };
      await this.jobManager.updateProgress(jobId, 40);
      const conversionResponse = await this.callProcessingService(
        `${processingServiceUrl}/convert`,
        {
          url: request.url,
          format: request.format,
          quality: request.quality,
        }
      );
      if (!conversionResponse.success) {
        throw new Error(`Conversion failed: ${conversionResponse.error}`);
      }
      await this.jobManager.updateProgress(jobId, 80);
      const fileName = this.generateFileName(metadata.title, request.format);
      const resultObj = conversionResponse.result;
      const downloadUrl = await this.storage.uploadFile(
        fileName,
        resultObj.file_path,
        request.format
      );
      await this.jobManager.updateProgress(jobId, 100);
      await this.jobManager.completeJob(
        jobId,
        downloadUrl,
        resultObj.file_path,
        metadata
      );
    } catch (error) {
      console.error(`Processing failed for job ${jobId}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.jobManager.failJob(jobId, errorMessage);
    }
  }
  /**
   * Call the video processing service
   */
  async callProcessingService(url, data) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(
        `Processing service error: ${response.status} ${response.statusText}`
      );
    }
    return await response.json();
  }
  /**
   * Generate a safe filename
   */
  generateFileName(title, format) {
    const cleanTitle = title
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    const timestamp = Date.now();
    return `${cleanTitle}_${timestamp}.${format}`;
  }
  /**
   * Clean up expired jobs and files
   */
  async cleanupExpiredJobs() {
    const deletedCount = await this.jobManager.cleanupExpiredJobs();
    console.log(`Cleaned up ${deletedCount} expired jobs`);
  }
};
__name(ConversionService, 'ConversionService');

// src/utils/queue-manager.ts
var QueueManager = class {
  db;
  env;
  maxConcurrentJobs;
  jobTimeoutMs;
  constructor(env, maxConcurrentJobs = 5, jobTimeoutMs = 10 * 60 * 1e3) {
    this.env = env;
    this.db = new DatabaseManager(env);
    this.maxConcurrentJobs = maxConcurrentJobs;
    this.jobTimeoutMs = jobTimeoutMs;
  }
  /**
   * Get queue statistics
   */
  async getQueueStats() {
    if (!this.env.DB) {
      return {
        total: 0,
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        avgProcessingTime: 0,
      };
    }
    const stats = await this.env.DB.prepare(
      `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        AVG(CASE WHEN status = 'completed' THEN updated_at - created_at ELSE NULL END) as avgProcessingTime
      FROM conversion_jobs 
      WHERE created_at > strftime('%s', 'now', '-24 hours')
    `
    ).first();
    return (
      stats || {
        total: 0,
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        avgProcessingTime: 0,
      }
    );
  }
  /**
   * Get next jobs to process based on priority
   */
  async getNextJobs(limit = 1) {
    if (!this.env.DB) {
      return [];
    }
    const jobs = await this.env.DB.prepare(
      `
      SELECT * FROM conversion_jobs 
      WHERE status = 'queued' 
      ORDER BY 
        CASE 
          WHEN format = 'mp3' THEN 1 
          ELSE 2 
        END,
        created_at ASC
      LIMIT ?
    `
    )
      .bind(limit)
      .all();
    return jobs.results || [];
  }
  /**
   * Check for stuck/timeout jobs and reset them
   */
  async handleTimeoutJobs() {
    if (!this.env.DB) {
      return 0;
    }
    const timeoutThreshold = Math.floor((Date.now() - this.jobTimeoutMs) / 1e3);
    const result = await this.env.DB.prepare(
      `
      UPDATE conversion_jobs 
      SET status = 'failed', 
          error_message = 'Job timeout - processing took too long',
          updated_at = strftime('%s', 'now')
      WHERE status = 'processing' 
        AND updated_at < ?
    `
    )
      .bind(timeoutThreshold)
      .run();
    const timeoutCount = result.meta.changes || 0;
    if (timeoutCount > 0) {
      console.log(`Reset ${timeoutCount} timeout jobs`);
    }
    return timeoutCount;
  }
  /**
   * Get jobs by status with pagination
   */
  async getJobsByStatus(status, limit = 50, offset = 0) {
    if (!this.env.DB) {
      return [];
    }
    const jobs = await this.env.DB.prepare(
      `
      SELECT * FROM conversion_jobs 
      WHERE status = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `
    )
      .bind(status, limit, offset)
      .all();
    return jobs.results || [];
  }
  /**
   * Get recent jobs with optional filtering
   */
  async getRecentJobs(hours = 24, platform, format, limit = 100) {
    if (!this.env.DB) {
      return [];
    }
    let query = `
      SELECT * FROM conversion_jobs 
      WHERE created_at > strftime('%s', 'now', '-${hours} hours')
    `;
    const params = [];
    if (platform) {
      query += ' AND platform = ?';
      params.push(platform);
    }
    if (format) {
      query += ' AND format = ?';
      params.push(format);
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    const jobs = await this.env.DB.prepare(query)
      .bind(...params)
      .all();
    return jobs.results || [];
  }
  /**
   * Calculate job priority based on various factors
   */
  calculateJobPriority(job) {
    let priority = 100;
    if (job.format === 'mp3') {
      priority += 20;
    }
    const ageHours = (Date.now() - job.created_at) / (1e3 * 60 * 60);
    priority += Math.min(ageHours * 5, 50);
    const platformPriority = {
      tiktok: 10,
      youtube: 5,
      twitter: 8,
      instagram: 7,
      facebook: 3,
    };
    priority += platformPriority[job.platform.toLowerCase()] || 0;
    return Math.round(priority);
  }
  /**
   * Get queue position for a specific job
   */
  async getJobQueuePosition(jobId) {
    if (!this.env.DB) {
      return -1;
    }
    const job = await this.db.getConversionJob(jobId);
    if (!job || job.status !== 'queued') {
      return -1;
    }
    const result = await this.env.DB.prepare(
      `
      SELECT COUNT(*) as position FROM conversion_jobs 
      WHERE status = 'queued' 
        AND (
          (format = 'mp3' AND ? = 'mp4') OR
          (format = ? AND created_at < ?)
        )
    `
    )
      .bind(job.format, job.format, job.created_at)
      .first();
    return (result?.position || 0) + 1;
  }
  /**
   * Update usage statistics
   */
  async updateUsageStats(job) {
    if (!this.env.DB || job.status !== 'completed') {
      return;
    }
    const today = /* @__PURE__ */ new Date().toISOString().split('T')[0];
    const duration = job.updated_at - job.created_at;
    await this.env.DB.prepare(
      `
      INSERT INTO usage_stats (date, platform, format, total_conversions, successful_conversions, total_duration)
      VALUES (?, ?, ?, 1, 1, ?)
      ON CONFLICT(date, platform, format) DO UPDATE SET
        total_conversions = total_conversions + 1,
        successful_conversions = successful_conversions + 1,
        total_duration = total_duration + ?,
        updated_at = strftime('%s', 'now')
    `
    )
      .bind(today, job.platform, job.format, duration, duration)
      .run();
  }
  /**
   * Clean up old completed/failed jobs
   */
  async cleanupOldJobs(olderThanHours = 168) {
    if (!this.env.DB) {
      return 0;
    }
    const cutoffTime = Math.floor(
      (Date.now() - olderThanHours * 60 * 60 * 1e3) / 1e3
    );
    const result = await this.env.DB.prepare(
      `
      DELETE FROM conversion_jobs 
      WHERE (status = 'completed' OR status = 'failed') 
        AND updated_at < ?
    `
    )
      .bind(cutoffTime)
      .run();
    const deletedCount = result.meta.changes || 0;
    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} old jobs`);
    }
    return deletedCount;
  }
  /**
   * Get processing capacity info
   */
  async getCapacityInfo() {
    const stats = await this.getQueueStats();
    return {
      maxConcurrent: this.maxConcurrentJobs,
      currentProcessing: stats.processing,
      availableSlots: Math.max(0, this.maxConcurrentJobs - stats.processing),
      queueLength: stats.queued,
    };
  }
};
__name(QueueManager, 'QueueManager');

// src/utils/file-cleanup.ts
var FileCleanupService = class {
  env;
  storage;
  queueManager;
  config;
  isRunning = false;
  cleanupTimer;
  stats;
  constructor(env, config = {}) {
    this.env = env;
    this.storage = new StorageManager(env);
    this.queueManager = new QueueManager(env);
    this.config = {
      maxFileAge: 7 * 24 * 60 * 60 * 1e3,
      // 7 days
      maxStorageSize: 10 * 1024 * 1024 * 1024,
      // 10GB
      cleanupInterval: 6 * 60 * 60 * 1e3,
      // 6 hours
      batchSize: 100,
      ...config,
    };
    this.stats = {
      filesDeleted: 0,
      bytesFreed: 0,
      jobsExpired: 0,
      lastCleanup: 0,
      nextCleanup: Date.now() + this.config.cleanupInterval,
    };
  }
  /**
   * Start the cleanup service
   */
  async start() {
    if (this.isRunning) {
      console.log('File cleanup service is already running');
      return;
    }
    console.log('Starting file cleanup service...');
    this.isRunning = true;
    await this.performCleanup();
    this.scheduleNextCleanup();
  }
  /**
   * Stop the cleanup service
   */
  async stop() {
    if (!this.isRunning) {
      console.log('File cleanup service is not running');
      return;
    }
    console.log('Stopping file cleanup service...');
    this.isRunning = false;
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = void 0;
    }
  }
  /**
   * Get cleanup statistics
   */
  getStats() {
    return { ...this.stats };
  }
  /**
   * Perform manual cleanup
   */
  async performCleanup() {
    const startTime = Date.now();
    console.log('Starting file cleanup...');
    try {
      const expiredJobs = await this.queueManager.cleanupOldJobs(
        this.config.maxFileAge / (60 * 60 * 1e3)
        // Convert to hours
      );
      const deletedFiles = await this.storage.cleanupOldFiles(
        this.config.maxFileAge
      );
      this.stats.jobsExpired += expiredJobs;
      this.stats.filesDeleted += deletedFiles;
      this.stats.lastCleanup = startTime;
      this.stats.nextCleanup = startTime + this.config.cleanupInterval;
      const duration = Date.now() - startTime;
      console.log(
        `Cleanup completed in ${duration}ms: ${expiredJobs} jobs expired, ${deletedFiles} files deleted`
      );
      return this.getStats();
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }
  /**
   * Clean up files by size limit
   */
  async cleanupBySize() {
    if (!this.env.STORAGE) {
      console.warn('R2 storage not available for size-based cleanup');
      return 0;
    }
    try {
      const files = await this.storage.listFiles();
      let totalSize = 0;
      const fileInfos = [];
      for (const key of files) {
        const fileName = key.replace('conversions/', '');
        const metadata = await this.storage.getFileMetadata(fileName);
        if (metadata) {
          fileInfos.push({
            key,
            size: metadata.size,
            uploaded: new Date(metadata.lastModified),
          });
          totalSize += metadata.size;
        }
      }
      if (totalSize <= this.config.maxStorageSize) {
        console.log(`Storage size (${totalSize} bytes) is within limit`);
        return 0;
      }
      fileInfos.sort((a, b) => a.uploaded.getTime() - b.uploaded.getTime());
      let deletedCount = 0;
      let freedBytes = 0;
      for (const fileInfo of fileInfos) {
        if (totalSize - freedBytes <= this.config.maxStorageSize) {
          break;
        }
        const fileName = fileInfo.key.replace('conversions/', '');
        const deleted = await this.storage.deleteFile(fileName);
        if (deleted) {
          deletedCount++;
          freedBytes += fileInfo.size;
          console.log(`Deleted ${fileName} (${fileInfo.size} bytes)`);
        }
      }
      this.stats.filesDeleted += deletedCount;
      this.stats.bytesFreed += freedBytes;
      console.log(
        `Size-based cleanup: deleted ${deletedCount} files, freed ${freedBytes} bytes`
      );
      return deletedCount;
    } catch (error) {
      console.error('Error during size-based cleanup:', error);
      return 0;
    }
  }
  /**
   * Clean up orphaned files (files without corresponding jobs)
   */
  async cleanupOrphanedFiles() {
    if (!this.env.STORAGE || !this.env.DB) {
      console.warn(
        'Storage or database not available for orphaned file cleanup'
      );
      return 0;
    }
    try {
      const files = await this.storage.listFiles();
      let deletedCount = 0;
      for (const key of files) {
        const fileName = key.replace('conversions/', '');
        const job = await this.env.DB.prepare(
          `
          SELECT id FROM conversion_jobs 
          WHERE file_path LIKE ? OR download_url LIKE ?
        `
        )
          .bind(`%${fileName}%`, `%${fileName}%`)
          .first();
        if (!job) {
          const deleted = await this.storage.deleteFile(fileName);
          if (deleted) {
            deletedCount++;
            console.log(`Deleted orphaned file: ${fileName}`);
          }
        }
      }
      this.stats.filesDeleted += deletedCount;
      console.log(`Orphaned file cleanup: deleted ${deletedCount} files`);
      return deletedCount;
    } catch (error) {
      console.error('Error during orphaned file cleanup:', error);
      return 0;
    }
  }
  /**
   * Schedule the next cleanup
   */
  scheduleNextCleanup() {
    if (!this.isRunning) return;
    this.cleanupTimer = setTimeout(() => {
      this.performCleanup()
        .catch(error => {
          console.error('Error in scheduled cleanup:', error);
        })
        .finally(() => {
          this.scheduleNextCleanup();
        });
    }, this.config.cleanupInterval);
  }
  /**
   * Get storage usage statistics
   */
  async getStorageStats() {
    if (!this.env.STORAGE) {
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestFile: null,
        newestFile: null,
      };
    }
    try {
      const files = await this.storage.listFiles();
      let totalSize = 0;
      let oldestFile = null;
      let newestFile = null;
      for (const key of files) {
        const fileName = key.replace('conversions/', '');
        const metadata = await this.storage.getFileMetadata(fileName);
        if (metadata) {
          totalSize += metadata.size;
          const uploadDate = new Date(metadata.lastModified);
          if (!oldestFile || uploadDate < oldestFile) {
            oldestFile = uploadDate;
          }
          if (!newestFile || uploadDate > newestFile) {
            newestFile = uploadDate;
          }
        }
      }
      return {
        totalFiles: files.length,
        totalSize,
        oldestFile,
        newestFile,
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestFile: null,
        newestFile: null,
      };
    }
  }
};
__name(FileCleanupService, 'FileCleanupService');

// src/handlers/router.ts
var router = new Hono2();
router.post('/validate', async c => {
  try {
    const body = await c.req.json();
    if (!body.url) {
      return c.json(
        {
          error: {
            type: 'INVALID_URL' /* INVALID_URL */,
            message: 'URL is required',
            retryable: false,
          },
        },
        400
      );
    }
    let cachedValidation = null;
    if (c.env.CACHE) {
      try {
        const cache = new CacheManager(c.env);
        cachedValidation = await cache.getUrlValidation(body.url);
        if (cachedValidation) {
          return c.json({
            isValid: cachedValidation.isValid,
            platform: cachedValidation.platform,
            cached: true,
            timestamp: cachedValidation.timestamp,
          });
        }
      } catch (error) {
        console.warn('Cache error (continuing without cache):', error);
      }
    }
    const validation = UrlValidator.validateUrl(body.url);
    if (c.env.CACHE) {
      try {
        const cache = new CacheManager(c.env);
        await cache.cacheUrlValidation(
          body.url,
          validation.isValid,
          validation.platform?.name
        );
      } catch (error) {
        console.warn('Cache error (continuing without cache):', error);
      }
    }
    if (!validation.isValid) {
      return c.json(
        {
          isValid: false,
          error: validation.error,
        },
        400
      );
    }
    return c.json({
      isValid: true,
      platform: validation.platform,
      videoId: validation.videoId,
      normalizedUrl: validation.normalizedUrl,
    });
  } catch (error) {
    console.error('URL validation error:', error);
    return c.json(
      {
        error: {
          type: 'SERVER_ERROR' /* SERVER_ERROR */,
          message: 'Internal server error during URL validation',
          retryable: true,
        },
      },
      500
    );
  }
});
router.get('/platforms', async c => {
  try {
    let platforms = null;
    if (c.env.CACHE) {
      try {
        const cache = new CacheManager(c.env);
        platforms = await cache.getPlatforms();
      } catch (error) {
        console.warn('Cache error (continuing without cache):', error);
      }
    }
    if (!platforms) {
      if (c.env.DB) {
        try {
          const db = new DatabaseManager(c.env);
          const platformConfigs = await db.getAllPlatforms();
          platforms = platformConfigs.map(config =>
            UrlValidator.convertPlatformConfig(config)
          );
          if (c.env.CACHE) {
            try {
              const cache = new CacheManager(c.env);
              await cache.cachePlatforms(platforms);
            } catch (error) {
              console.warn('Cache error (continuing without cache):', error);
            }
          }
        } catch (error) {
          console.warn(
            'Database error, falling back to static platforms:',
            error
          );
        }
      }
      if (!platforms) {
        platforms = [
          {
            name: 'YouTube',
            domain: 'youtube.com',
            supportedFormats: ['mp3', 'mp4'],
            maxDuration: 7200,
            icon: '\u{1F3A5}',
            qualityOptions: {
              mp3: ['128', '192', '320'],
              mp4: ['360', '720', '1080'],
            },
          },
          {
            name: 'TikTok',
            domain: 'tiktok.com',
            supportedFormats: ['mp3', 'mp4'],
            maxDuration: 600,
            icon: '\u{1F3B5}',
            qualityOptions: {
              mp3: ['128', '192'],
              mp4: ['360', '720'],
            },
          },
          {
            name: 'X (Twitter)',
            domain: 'x.com',
            supportedFormats: ['mp3', 'mp4'],
            maxDuration: 1200,
            icon: '\u{1F426}',
            qualityOptions: {
              mp3: ['128', '192'],
              mp4: ['360', '720'],
            },
          },
          {
            name: 'Facebook',
            domain: 'facebook.com',
            supportedFormats: ['mp3', 'mp4'],
            maxDuration: 3600,
            icon: '\u{1F4D8}',
            qualityOptions: {
              mp3: ['128', '192'],
              mp4: ['360', '720'],
            },
          },
          {
            name: 'Instagram',
            domain: 'instagram.com',
            supportedFormats: ['mp3', 'mp4'],
            maxDuration: 900,
            icon: '\u{1F4F7}',
            qualityOptions: {
              mp3: ['128', '192'],
              mp4: ['360', '720'],
            },
          },
        ];
      }
    }
    const response = { platforms };
    return c.json(response);
  } catch (error) {
    console.error('Platforms endpoint error:', error);
    return c.json(
      {
        error: {
          type: 'SERVER_ERROR' /* SERVER_ERROR */,
          message: 'Failed to fetch platform information',
          retryable: true,
        },
      },
      500
    );
  }
});
router.post('/convert', async c => {
  try {
    const body = await c.req.json();
    if (!body.url || !body.format || !body.quality) {
      return c.json(
        {
          error: {
            type: 'INVALID_URL' /* INVALID_URL */,
            message: 'URL, format, and quality are required',
            retryable: false,
          },
        },
        400
      );
    }
    const validation = UrlValidator.validateUrl(body.url);
    if (!validation.isValid) {
      return c.json(
        {
          error: validation.error,
        },
        400
      );
    }
    const formatValidation = UrlValidator.validateFormatAndQuality(
      validation.platform,
      body.format,
      body.quality
    );
    if (!formatValidation.isValid) {
      return c.json(
        {
          error: formatValidation.error,
        },
        400
      );
    }
    const conversionRequest = {
      ...body,
      platform: validation.platform?.name,
    };
    const conversionService = new ConversionService(c.env);
    const jobId = await conversionService.startConversion(conversionRequest);
    return c.json({
      success: true,
      jobId,
      status: 'queued',
      message: 'Conversion job started successfully',
      estimatedTime: '30-120 seconds',
    });
  } catch (error) {
    console.error('Conversion endpoint error:', error);
    return c.json(
      {
        error: {
          type: 'SERVER_ERROR' /* SERVER_ERROR */,
          message: 'Internal server error during conversion request',
          retryable: true,
        },
      },
      500
    );
  }
});
router.get('/status/:jobId', async c => {
  try {
    const jobId = c.req.param('jobId');
    if (!jobId) {
      return c.json(
        {
          error: {
            type: 'INVALID_URL' /* INVALID_URL */,
            message: 'Job ID is required',
            retryable: false,
          },
        },
        400
      );
    }
    const conversionService = new ConversionService(c.env);
    const status = await conversionService.getConversionStatus(jobId);
    if (!status) {
      return c.json(
        {
          error: {
            type: 'VIDEO_NOT_FOUND' /* VIDEO_NOT_FOUND */,
            message: 'Job not found',
            retryable: false,
          },
        },
        404
      );
    }
    return c.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('Status endpoint error:', error);
    return c.json(
      {
        error: {
          type: 'SERVER_ERROR' /* SERVER_ERROR */,
          message: 'Internal server error during status check',
          retryable: true,
        },
      },
      500
    );
  }
});
router.get('/download/:fileName', async c => {
  try {
    const fileName = c.req.param('fileName');
    if (!fileName) {
      return c.json(
        {
          error: {
            type: 'INVALID_URL' /* INVALID_URL */,
            message: 'File name is required',
            retryable: false,
          },
        },
        400
      );
    }
    const storage = new StorageManager(c.env);
    const file = await storage.getFile(fileName);
    if (!file) {
      return c.json(
        {
          error: {
            type: 'VIDEO_NOT_FOUND' /* VIDEO_NOT_FOUND */,
            message: 'File not found',
            retryable: false,
          },
        },
        404
      );
    }
    const headers = new Headers(file.headers);
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(file.body, {
      status: file.status,
      headers,
    });
  } catch (error) {
    console.error('Download endpoint error:', error);
    return c.json(
      {
        error: {
          type: 'SERVER_ERROR' /* SERVER_ERROR */,
          message: 'Internal server error during file download',
          retryable: true,
        },
      },
      500
    );
  }
});
router.get('/stream/:fileName', async c => {
  try {
    const fileName = c.req.param('fileName');
    const range = c.req.header('Range');
    if (!fileName) {
      return c.json(
        {
          error: {
            type: 'INVALID_URL' /* INVALID_URL */,
            message: 'File name is required',
            retryable: false,
          },
        },
        400
      );
    }
    const storage = new StorageManager(c.env);
    if (range) {
      const fileMetadata = await storage.getFileMetadata(fileName);
      if (!fileMetadata) {
        return c.json(
          {
            error: {
              type: 'VIDEO_NOT_FOUND' /* VIDEO_NOT_FOUND */,
              message: 'File not found',
              retryable: false,
            },
          },
          404
        );
      }
      const rangeMatch = range.match(/bytes=(\d+)-(\d*)/);
      if (!rangeMatch) {
        return c.json(
          {
            error: {
              type: 'INVALID_URL' /* INVALID_URL */,
              message: 'Invalid range header',
              retryable: false,
            },
          },
          400
        );
      }
      const start = parseInt(rangeMatch[1], 10);
      const fileSize = fileMetadata.size;
      const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : fileSize - 1;
      const contentLength = end - start + 1;
      const file = await storage.getFile(fileName);
      if (!file) {
        return c.json(
          {
            error: {
              type: 'VIDEO_NOT_FOUND' /* VIDEO_NOT_FOUND */,
              message: 'File not found',
              retryable: false,
            },
          },
          404
        );
      }
      return new Response(file.body, {
        status: 206,
        // Partial Content
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': contentLength.toString(),
          'Content-Type':
            file.headers.get('Content-Type') || 'application/octet-stream',
          'Accept-Ranges': 'bytes',
        },
      });
    } else {
      const file = await storage.getFile(fileName);
      if (!file) {
        return c.json(
          {
            error: {
              type: 'VIDEO_NOT_FOUND' /* VIDEO_NOT_FOUND */,
              message: 'File not found',
              retryable: false,
            },
          },
          404
        );
      }
      const headers = new Headers(file.headers);
      headers.set('Accept-Ranges', 'bytes');
      return new Response(file.body, {
        status: file.status,
        headers,
      });
    }
  } catch (error) {
    console.error('Stream endpoint error:', error);
    return c.json(
      {
        error: {
          type: 'SERVER_ERROR' /* SERVER_ERROR */,
          message: 'Internal server error during file streaming',
          retryable: true,
        },
      },
      500
    );
  }
});
router.get('/admin/jobs', async c => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const db = new DatabaseManager(c.env);
    const activeJobs = await db.getActiveConversionJobs();
    return c.json({
      success: true,
      jobs: activeJobs,
      count: activeJobs.length,
    });
  } catch (error) {
    console.error('Admin jobs endpoint error:', error);
    return c.json(
      {
        error: {
          type: 'SERVER_ERROR' /* SERVER_ERROR */,
          message: 'Internal server error',
          retryable: true,
        },
      },
      500
    );
  }
});
router.get('/admin/queue/stats', async c => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const queueManager = new QueueManager(c.env);
    const stats = await queueManager.getQueueStats();
    const capacity = await queueManager.getCapacityInfo();
    return c.json({
      success: true,
      stats,
      capacity,
      timestamp: /* @__PURE__ */ new Date().toISOString(),
    });
  } catch (error) {
    console.error('Queue stats endpoint error:', error);
    return c.json(
      {
        error: {
          type: 'SERVER_ERROR' /* SERVER_ERROR */,
          message: 'Internal server error',
          retryable: true,
        },
      },
      500
    );
  }
});
router.get('/admin/queue/jobs/:status', async c => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const status = c.req.param('status');
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const queueManager = new QueueManager(c.env);
    const jobs = await queueManager.getJobsByStatus(status, limit, offset);
    return c.json({
      success: true,
      jobs,
      count: jobs.length,
      pagination: {
        limit,
        offset,
        hasMore: jobs.length === limit,
      },
    });
  } catch (error) {
    console.error('Queue jobs endpoint error:', error);
    return c.json(
      {
        error: {
          type: 'SERVER_ERROR' /* SERVER_ERROR */,
          message: 'Internal server error',
          retryable: true,
        },
      },
      500
    );
  }
});
router.post('/admin/queue/cleanup', async c => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const body = await c.req.json().catch(() => ({}));
    const olderThanHours = body.olderThanHours || 168;
    const queueManager = new QueueManager(c.env);
    const deletedCount = await queueManager.cleanupOldJobs(olderThanHours);
    const timeoutCount = await queueManager.handleTimeoutJobs();
    return c.json({
      success: true,
      deletedJobs: deletedCount,
      timeoutJobs: timeoutCount,
      message: `Cleaned up ${deletedCount} old jobs and reset ${timeoutCount} timeout jobs`,
    });
  } catch (error) {
    console.error('Queue cleanup endpoint error:', error);
    return c.json(
      {
        error: {
          type: 'SERVER_ERROR' /* SERVER_ERROR */,
          message: 'Internal server error',
          retryable: true,
        },
      },
      500
    );
  }
});
router.get('/admin/queue/position/:jobId', async c => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const jobId = c.req.param('jobId');
    const queueManager = new QueueManager(c.env);
    const position = await queueManager.getJobQueuePosition(jobId);
    if (position === -1) {
      return c.json(
        {
          success: false,
          error: 'Job not found or not in queue',
        },
        404
      );
    }
    return c.json({
      success: true,
      jobId,
      position,
      message: `Job is at position ${position} in the queue`,
    });
  } catch (error) {
    console.error('Queue position endpoint error:', error);
    return c.json(
      {
        error: {
          type: 'SERVER_ERROR' /* SERVER_ERROR */,
          message: 'Internal server error',
          retryable: true,
        },
      },
      500
    );
  }
});
router.get('/admin/storage/stats', async c => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const cleanupService = new FileCleanupService(c.env);
    const storageStats = await cleanupService.getStorageStats();
    const cleanupStats = cleanupService.getStats();
    return c.json({
      success: true,
      storage: storageStats,
      cleanup: cleanupStats,
      timestamp: /* @__PURE__ */ new Date().toISOString(),
    });
  } catch (error) {
    console.error('Storage stats endpoint error:', error);
    return c.json(
      {
        error: {
          type: 'SERVER_ERROR' /* SERVER_ERROR */,
          message: 'Internal server error',
          retryable: true,
        },
      },
      500
    );
  }
});
router.post('/admin/storage/cleanup', async c => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const body = await c.req.json().catch(() => ({}));
    const cleanupType = body.type || 'all';
    const cleanupService = new FileCleanupService(c.env);
    let result;
    switch (cleanupType) {
      case 'age': {
        result = await cleanupService.performCleanup();
        break;
      }
      case 'size': {
        const deletedBySize = await cleanupService.cleanupBySize();
        result = { filesDeleted: deletedBySize, type: 'size-based' };
        break;
      }
      case 'orphaned': {
        const deletedOrphaned = await cleanupService.cleanupOrphanedFiles();
        result = { filesDeleted: deletedOrphaned, type: 'orphaned' };
        break;
      }
      case 'all':
      default: {
        const cleanupResult = await cleanupService.performCleanup();
        const sizeResult = await cleanupService.cleanupBySize();
        const orphanedResult = await cleanupService.cleanupOrphanedFiles();
        result = {
          ...cleanupResult,
          additionalFilesDeleted: sizeResult + orphanedResult,
          type: 'comprehensive',
        };
        break;
      }
    }
    return c.json({
      success: true,
      result,
      message: `Cleanup completed: ${result.filesDeleted || 0} files processed`,
    });
  } catch (error) {
    console.error('Storage cleanup endpoint error:', error);
    return c.json(
      {
        error: {
          type: 'SERVER_ERROR' /* SERVER_ERROR */,
          message: 'Internal server error',
          retryable: true,
        },
      },
      500
    );
  }
});
router.get('/admin/storage/files', async c => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const storage = new StorageManager(c.env);
    const files = await storage.listFiles();
    const fileDetails = await Promise.all(
      files.slice(0, 100).map(async key => {
        const fileName = key.replace('conversions/', '');
        const metadata = await storage.getFileMetadata(fileName);
        return {
          fileName,
          key,
          metadata,
        };
      })
    );
    return c.json({
      success: true,
      files: fileDetails,
      total: files.length,
      showing: Math.min(files.length, 100),
    });
  } catch (error) {
    console.error('Storage files endpoint error:', error);
    return c.json(
      {
        error: {
          type: 'SERVER_ERROR' /* SERVER_ERROR */,
          message: 'Internal server error',
          retryable: true,
        },
      },
      500
    );
  }
});
router.delete('/admin/storage/files/:fileName', async c => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const fileName = c.req.param('fileName');
    if (!fileName) {
      return c.json(
        {
          error: {
            type: 'INVALID_URL' /* INVALID_URL */,
            message: 'File name is required',
            retryable: false,
          },
        },
        400
      );
    }
    const storage = new StorageManager(c.env);
    const deleted = await storage.deleteFile(fileName);
    if (!deleted) {
      return c.json(
        {
          error: {
            type: 'VIDEO_NOT_FOUND' /* VIDEO_NOT_FOUND */,
            message: 'File not found or could not be deleted',
            retryable: false,
          },
        },
        404
      );
    }
    return c.json({
      success: true,
      message: `File ${fileName} deleted successfully`,
    });
  } catch (error) {
    console.error('Storage delete endpoint error:', error);
    return c.json(
      {
        error: {
          type: 'SERVER_ERROR' /* SERVER_ERROR */,
          message: 'Internal server error',
          retryable: true,
        },
      },
      500
    );
  }
});

// src/index.ts
var app = new Hono2();
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: origin => {
      if (origin?.includes('localhost') || origin?.includes('127.0.0.1')) {
        return origin;
      }
      const allowedOrigins = [
        'https://getgoodtape.com',
        'https://www.getgoodtape.com',
      ];
      return allowedOrigins.includes(origin || '') ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);
app.get('/health', c => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    environment: c.env.ENVIRONMENT,
  });
});
app.route('/api', router);
app.notFound(c => {
  return c.json({ error: 'Not Found' }, 404);
});
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: c.env.ENVIRONMENT === 'development' ? err.message : void 0,
    },
    500
  );
});
var src_default = app;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(
  async (request, env, _ctx, middlewareCtx) => {
    try {
      return await middlewareCtx.next(request, env);
    } finally {
      try {
        if (request.body !== null && !request.bodyUsed) {
          const reader = request.body.getReader();
          while (!(await reader.read()).done) {}
        }
      } catch (e) {
        console.error('Failed to drain the unused request body.', e);
      }
    }
  },
  'drainBody'
);
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause),
  };
}
__name(reduceError, 'reduceError');
var jsonError = /* @__PURE__ */ __name(
  async (request, env, _ctx, middlewareCtx) => {
    try {
      return await middlewareCtx.next(request, env);
    } catch (e) {
      const error = reduceError(e);
      return Response.json(error, {
        status: 500,
        headers: { 'MF-Experimental-Error-Stack': 'true' },
      });
    }
  },
  'jsonError'
);
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-ZO1t3y/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default,
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, '__facade_register__');
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    },
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, '__facade_invokeChain__');
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware,
  ]);
}
__name(__facade_invoke__, '__facade_invoke__');

// .wrangler/tmp/bundle-ZO1t3y/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError('Illegal invocation');
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, '__Facade_ScheduledController__');
function wrapExportedHandler(worker) {
  if (
    __INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 ||
    __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0
  ) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function (request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error('Handler does not export a fetch() function.');
    }
    return worker.fetch(request, env, ctx);
  }, 'fetchDispatcher');
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function (type, init) {
        if (type === 'scheduled' && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? '',
            () => {}
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, 'dispatcher');
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    },
  };
}
__name(wrapExportedHandler, 'wrapExportedHandler');
function wrapWorkerEntrypoint(klass) {
  if (
    __INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 ||
    __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0
  ) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error('Entrypoint class does not define a fetch() function.');
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === 'scheduled' && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? '',
          () => {}
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, 'wrapWorkerEntrypoint');
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === 'object') {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === 'function') {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default,
};
//# sourceMappingURL=index.js.map
