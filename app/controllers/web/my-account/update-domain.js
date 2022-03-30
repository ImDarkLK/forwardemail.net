const Boom = require('@hapi/boom');
const _ = require('lodash');
const isSANB = require('is-string-and-not-blank');
const { boolean } = require('boolean');
const { isPort } = require('validator');

const { Domains } = require('#models');

// eslint-disable-next-line complexity
async function updateDomain(ctx, next) {
  ctx.state.domain = await Domains.findById(ctx.state.domain._id);

  // Custom SMTP Port Forwarding
  if (isSANB(ctx.request.body.smtp_port)) {
    if (isPort(ctx.request.body.smtp_port))
      ctx.state.domain.smtp_port = ctx.request.body.smtp_port;
    else return ctx.throw(Boom.badRequest(ctx.translateError('INVALID_PORT')));
  }

  // Boolean settings for spam and requiring recipient verification
  if (ctx.api) {
    // require paid plan (note that the API middleware already does this)
    for (const bool of [
      'has_adult_content_protection',
      'has_phishing_protection',
      'has_executable_protection',
      'has_virus_protection',
      'has_recipient_verification'
    ]) {
      if (_.isBoolean(ctx.request.body[bool]) || isSANB(ctx.request.body[bool]))
        ctx.state.domain[bool] = boolean(ctx.request.body[bool]);
    }
  } else if (ctx.request.body._section === 'spam_scanner_settings') {
    // require paid plan
    if (ctx.state.domain.plan === 'free')
      return ctx.throw(
        Boom.badRequest(ctx.translateError('PLAN_UPGRADE_REQUIRED'))
      );
    for (const bool of [
      'has_adult_content_protection',
      'has_phishing_protection',
      'has_executable_protection',
      'has_virus_protection'
    ]) {
      ctx.state.domain[bool] = boolean(ctx.request.body[bool]);
    }
  } else if (ctx.request.body._section === 'recipient_verification') {
    // require paid plan
    if (ctx.state.domain.plan === 'free')
      return ctx.throw(
        Boom.badRequest(ctx.translateError('PLAN_UPGRADE_REQUIRED'))
      );
    ctx.state.domain.has_recipient_verification = boolean(
      ctx.request.body.has_recipient_verification
    );
  }

  // custom verification IFF allowed
  if (
    !ctx.api &&
    ctx.request.body._section === 'custom_verification_template'
  ) {
    // require paid plan
    if (
      ctx.state.domain.plan === 'free' ||
      !ctx.state.domain.has_custom_verification
    )
      return ctx.throw(
        Boom.badRequest(ctx.translateError('PLAN_UPGRADE_REQUIRED'))
      );
    for (const prop of ['name', 'email', 'subject', 'redirect', 'html']) {
      if (_.isString(ctx.request.body[`custom_verification_${prop}`])) {
        ctx.state.domain.custom_verification[prop] = isSANB(
          ctx.request.body[`custom_verification_${prop}`]
        )
          ? ctx.request.body[`custom_verification_${prop}`]
          : '';
      }
    }
  }

  // TODO: eventually let users customize the text portion (for now we use html-to-text)

  ctx.state.domain.locale = ctx.locale;
  ctx.state.domain.skip_verification = true;
  ctx.state.domain = await ctx.state.domain.save();

  if (ctx.api) return next();

  ctx.flash('custom', {
    title: ctx.request.t('Success'),
    text: ctx.translate('REQUEST_OK'),
    type: 'success',
    toast: true,
    showConfirmButton: false,
    timer: 3000,
    position: 'top'
  });

  if (ctx.accepts('html')) ctx.redirect('back');
  else ctx.body = { reloadPage: true };
}

module.exports = updateDomain;
