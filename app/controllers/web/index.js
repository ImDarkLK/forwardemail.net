const _ = require('lodash');
const humanize = require('humanize-string');
const reservedEmailAddressesList = require('reserved-email-addresses-list');
const titleize = require('titleize');
const admin = require('./admin');
const api = require('./api');
const auth = require('./auth');
const faq = require('./faq');
const help = require('./help');
const myAccount = require('./my-account');
const onboard = require('./onboard');
const otp = require('./otp');
const report = require('./report');
const config = require('#config');

function breadcrumbs(ctx, next) {
  const breadcrumbs = _.compact(ctx.path.split('/')).slice(1);
  ctx.state.breadcrumbs = breadcrumbs;

  // TODO: should this titleize(humanize( usage get wrapped with translation?
  // only override the title if the match was not accurate
  if (!config.meta[ctx.pathWithoutLocale])
    ctx.state.meta.title = ctx.request.t(
      breadcrumbs.length === 1
        ? titleize(humanize(breadcrumbs[0]))
        : `${titleize(humanize(breadcrumbs[0]))} - ${titleize(
            humanize(breadcrumbs[1])
          )}`
    );

  return next();
}

function reservedEmailAddresses(ctx, next) {
  ctx.state.reservedEmailAddressesList = reservedEmailAddressesList;
  return next();
}

module.exports = {
  admin,
  api,
  auth,
  breadcrumbs,
  faq,
  help,
  myAccount,
  onboard,
  otp,
  report,
  reservedEmailAddresses
};
