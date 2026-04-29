export const ensureBrowserHost = (documentRef: Document, hostId: string) => {
  const existingHost = documentRef.getElementById(hostId);

  if (existingHost instanceof HTMLElement) {
    return existingHost;
  }

  const host = documentRef.createElement('div');
  host.id = hostId;
  documentRef.body.append(host);

  return host;
};
