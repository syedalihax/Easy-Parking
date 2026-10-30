import GoogleIcon from './GoogleIcon';

function ProductPreview({ t }) {
  return (
    <div className="product-preview" aria-label={t('landing.hero.previewLabel')}>
      <div className="preview-window-bar">
        <div className="preview-window-dots" aria-hidden="true"><i /><i /><i /></div>
        <span>{t('landing.hero.previewTitle')}</span>
        <span className="preview-window-status"><span />{t('landing.hero.period')}</span>
      </div>
      <div className="preview-content">
        <div className="preview-title-row">
          <div>
            <p className="preview-kicker">{t('landing.hero.previewLabel')}</p>
            <h2>{t('landing.hero.previewTitle')}</h2>
          </div>
          <span className="preview-brand-mark" aria-hidden="true"><GoogleIcon name="local_parking" size={19} /></span>
        </div>
        <div className="preview-metrics">
          <div className="preview-metric preview-metric-highlight">
            <span>{t('landing.hero.collection')}</span>
            <strong dir="ltr">Rs. 186,000</strong>
            <small><GoogleIcon name="check_circle" size={13} />{t('landing.hero.period')}</small>
          </div>
          <div className="preview-metric">
            <span>{t('landing.hero.members')}</span>
            <strong dir="ltr">128</strong>
            <small><GoogleIcon name="groups" size={13} />{t('landing.showcase.previewLabel')}</small>
          </div>
          <div className="preview-metric">
            <span>{t('landing.hero.vehicles')}</span>
            <strong dir="ltr">164</strong>
            <small><GoogleIcon name="directions_car" size={13} />{t('landing.showcase.previewLabel')}</small>
          </div>
          <div className="preview-metric preview-metric-due">
            <span>{t('landing.hero.due')}</span>
            <strong dir="ltr">12</strong>
            <small><GoogleIcon name="schedule" size={13} />{t('landing.showcase.pending')}</small>
          </div>
        </div>
        <div className="preview-activity">
          <div className="preview-activity-heading">
            <strong>{t('landing.hero.activity')}</strong>
            <span>{t('landing.showcase.previewLabel')}</span>
          </div>
          <div className="preview-activity-row">
            <span className="preview-activity-icon"><GoogleIcon name="payments" size={16} /></span>
            <span className="preview-activity-copy"><strong>{t('landing.hero.activityOne')}</strong><small>Rs. 2,000 · {t('landing.hero.period')}</small></span>
            <span className="preview-activity-status">{t('landing.hero.received')}</span>
          </div>
          <div className="preview-activity-row">
            <span className="preview-activity-icon preview-activity-icon-lime"><GoogleIcon name="directions_car" size={16} /></span>
            <span className="preview-activity-copy"><strong>{t('landing.hero.activityTwo')}</strong><small>{t('landing.showcase.vehicleNumber')}</small></span>
            <span className="preview-activity-status preview-activity-status-muted">{t('landing.hero.updated')}</span>
          </div>
        </div>
      </div>
      <span className="preview-footnote"><GoogleIcon name="verified" size={14} />{t('landing.hero.previewLabel')}</span>
    </div>
  );
}

export default ProductPreview;
